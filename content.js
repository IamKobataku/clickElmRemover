// リスナ
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // console.log(sender.tab ?
  //     "from a content script:" + sender.tab.url :
  //     "from the extension");
  switch (request.type) {
    case "toggle_switch":
      if (request.flag) {
        ClickElmRemover.turnOn();
      } else {
        ClickElmRemover.turnOff();
      }
      break;
    case "redo":
      ClickElmRemover.redoElm(request);
      break;
    default:
      console.log(`Unknown type: ${request.type}`);
  }
});

/** このアプリケーションの名前空間を目的としたクラス */
class ClickElmRemover {
  /** Iframeにイベントを付与済みであるかどうか */
  static AddedIframeEventFlag = false;
  /** マウスオーバーされているiframeのクラス名を入れる。iframeに乗ってない場合は""になる */
  static mouseOverIframeClsName = "";
  /** @readonly iframeにsandbox属性を付与するが、もともとついてるパターンもあるはずなのでバックアップ用のオリジナルattributeを用意する */
  static SANDBOX_BACKUP_ATTR_KEY = "SANDBOX_BACKUP_ATTR_KEY";
  /** user-selectの値をバックアップしておく */
  static backupUserSelect = undefined;
  /** フィルタ用のSVG要素をオンメモリに持っておく */
  static filter = (() => {
    const feBlend = document.createElementNS("http://www.w3.org/2000/svg", "feBlend");
    feBlend.setAttribute("in", "SourceGraphic"); feBlend.setAttribute("in2", "floodFill"); feBlend.setAttribute("mode","multiply");
    const feFlood = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
    feFlood.setAttribute("result","floodFill"); feFlood.setAttribute("flood-color", "yellowgreen"); feFlood.setAttribute("flood-opacity", "0.7");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.id="spotlight";filter.setAttribute("x", "0%");filter.setAttribute("y","0%");filter.setAttribute("width","100%");filter.setAttribute("height", "100%");
    filter.appendChild(feFlood);filter.appendChild(feBlend);
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.appendChild(filter);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = 0; svg.style.height = 0; svg.style.position = "fixed";
    svg.appendChild(defs);
    document.body.appendChild(svg)
  })();
  /** フィルタをスポットライトと表現しているが、そのクラス名。 */
  static SPOTLIGHT_CLASS_NAME = this.getUniqID("spot");
  /** スポットライト指定用のCSSを生成。 */
  static addCSS = (() => {
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    const styleSheet = styleEl.sheet;
    styleSheet.insertRule(`.${this.SPOTLIGHT_CLASS_NAME}{filter:url(#spotlight);}`);
  })();

  /** 機能ON */
  static turnOn  () {
    this.addEvent();
    this.backupUserSelectAndToNone();
    document.body.focus(); // iframe削除に備えてフォーカス移動しておく
  }

  /** 機能OFF */
  static turnOff  () {
    this.removeEvent();
    this.restoreUserSelect();
    this.removeSpotlight();
  }

  /** クリックイベントの追加とiframeのイベント追加 */
  static addEvent () {
    window.addEventListener("click", this.clickhandler, true);
    window.addEventListener('blur', this.blurHandler, true);
    window.addEventListener("mouseover", this.mouseoverHandler, true);
    window.addEventListener("mouseout", this.mouseoutHandler, true);
    this.addIframeSetting();
  }

  /** iframeに対する設定の追加。クラスIDやイベントリスナなど */
  static addIframeSetting () {
    const iframes = this.searchIframes(document);
    const pref = this.getRandomPref(); // なぜわざわざランダムIDの接頭語をさらにランダムにするのか？⇒対策されて接頭語*のクラス名を除去するようなスクリプトを組まれないように
    for (let i = 0, l = iframes.length; i < l; i++) {
      this.setSandForIframe(iframes[i]);
      if (!this.AddedIframeEventFlag){
        // iframeにhoverイベント付与していないなら付与する。このイベント及びクラスIDは付与しっぱなしになる。
        const clsid = this.getUniqID(pref);
        iframes[i].classList.add(clsid);
        // このイベント消すのめんどいのでそのままにするつもり
        iframes[i].addEventListener("mouseover", () => {this.mouseOverIframeClsName = clsid});
        iframes[i].addEventListener("mouseout", () => {this.mouseOverIframeClsName = ""});
      }
    }
    this.AddedIframeEventFlag = true;
  }

  /** iframeにsandboxを付与する。 */
  static setSandForIframe (iframe) {
    const nowAttr = iframe.getAttribute("sandbox");
    const backAttr = iframe.getAttribute(this.SANDBOX_BACKUP_ATTR_KEY);
    if (backAttr === null) {
      // backがないなら初ONなのでバックアップする(nullの場合は"null"と入るので注意)
      iframe.setAttribute(this.SANDBOX_BACKUP_ATTR_KEY, nowAttr);
    }
    iframe.setAttribute("sandbox", "");
  }

  /** クリックイベントのみ削除(iframeイベントの削除が冗長になる割に見返り少ないため) */
  static removeEvent() {
    window.removeEventListener("click", this.clickhandler, true);
    window.removeEventListener("blur", this.blurHandler, true);
    window.removeEventListener("mouseover", this.mouseoverHandler, true);
    window.removeEventListener("mouseout", this.mouseoutHandler, true);
    this.restoreIframeSetting();
  }

  /** iframeの設定をリストア */
  static restoreIframeSetting() {
    const iframes = this.searchIframes(document);
    for (let i = 0, l = iframes.length; i < l; i++) {
      this.restoreSandForIframe(iframes[i]);
    }
  }

  /** iframeのsanbox属性をリストアする */
  static restoreSandForIframe (iframe) {
    const backAttr = iframe.getAttribute(this.SANDBOX_BACKUP_ATTR_KEY);
    if(backAttr === null) {
      // まだ一度もsandboxをセットしていないパターン。変更しない。
    } else if (backAttr === "null") {
      // 元々sandboxが設定されていなかったパターン
      iframe.removeAttribute("sandbox");
    } else {
      // リストアすべきパターン
      iframe.setAttribute("sandbox", backAttr);
    }
  }

  /** iframeのコンテナ要素を洗い出す */
  static searchIframes (elm) {
    /** iframeを格納している要素群 */
    let result = [];
    if (elm.tagName === "IFRAME") {
      return [elm];
    }
    const children = elm.children;
    if (children.length > 0) {
      for (let i = 0, l = children.length;i<l;i++) {
        Array.prototype.push.apply(result, this.searchIframes(children[i]));
      }
    }
    return result;
  }

  /** bodyのuserSelectの値をバックアップしておいてnoneに設定 */
  static backupUserSelectAndToNone () {
    if (this.backupUserSelect === undefined) {
      this.backupUserSelect = window.document.body.style.userSelect;
    }
    window.document.body.style.userSelect = "none";
  }

  /** bodyのuserSelectを戻す */
  static restoreUserSelect () {
    if (this.backupUserSelect !== undefined){
      window.document.body.style.userSelect = this.backupUserSelect;
    }
    // バックアップない場合はなにもしない
  }

  /** スポットライトを消す */
  static removeSpotlight() {
    const elms = document.getElementsByClassName(this.SPOTLIGHT_CLASS_NAME);
    for (let i = 0, l = elms.length; i < l; i++) {
      elms[i].classList.remove(this.SPOTLIGHT_CLASS_NAME);
    }
  }

  /** クリック時のイベントハンドラ */
  static clickhandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      // redo
      chrome.runtime.sendMessage({ type: "getRedo" }, (response) => {
        if (response) {
          this.redoElm(response);
        } else {
          window.alert("no more history");
        }
      });
    } else {
      // remove
      const o = this.removeElm(e.target);
      o.type = "remove"; // メッセージのタイプを挿入
      chrome.runtime.sendMessage(o);
    }
    return false;
  }

  /** フォーカスアウト時のイベントハンドラ。iframe用。 */
  static  blurHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      // redo
      chrome.runtime.sendMessage({ type: "getRedo" }, (response) => {
        if (response) {
          this.redoElm(response);
        } else {
          window.alert("no more history");
        }
      });
    } else {
      // remove
      // 削除対象がiframeかどうかを判別してターゲットを変える
      if (this.mouseOverIframeClsName !== "") {
        const elm = document.getElementsByClassName(this.mouseOverIframeClsName)[0]
        const o = this.removeElm(elm);
        o.type = "remove"; // メッセージのタイプを挿入
        chrome.runtime.sendMessage(o);
      }
    }
    document.body.focus(); // 最後にbodyにフォーカスを戻す。iframe連続クリック対策。
  }

  /** 指定Elementを消す */
  static removeElm (target) {
    const myIDClass = this.getUniqID("idclsForCER");
    target.classList.add(myIDClass); // このスクリプト内でIDとして利用するクラスを追加する
    const dispBack = target.style.display;
    target.style.display = "none";
    return { idcls: myIDClass, dispBack: dispBack };
  }

  static mouseoverHandler = (e) => {
    e.target.classList.add(this.SPOTLIGHT_CLASS_NAME);
  }

  static mouseoutHandler = (e) => {
    e.target.classList.remove(this.SPOTLIGHT_CLASS_NAME);
  }

  /** 消していたElementを再表示する */
  static redoElm (obj) {
    const elm = document.getElementsByClassName(obj.idcls)[0]; // ID(class)からElementをひっぱり
    if (elm) {
      elm.style.display = obj.dispBack; // displayを戻して
      elm.classList.remove(obj.idcls); // ID(class)を消す
    }
    // ない場合は無視
  }

  /** ランダムな文字列を渡す */
  static getUniqID (pref) {
    return `${pref}_${Math.floor(Math.random() * 1000000)}_${Date.now()}`;
  }

  /** 4～10文字のランダム文字列を返す */
  static getRandomPref () {
    const l = 4 + Math.floor(Math.random() * 7);
    const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const cl = c.length;
    let r = "";
    for(var i=0; i<l; i++){
      r += c[Math.floor(Math.random()*cl)];
    }
    return r;
  }
}