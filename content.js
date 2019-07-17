window.mouseOverIframeClsName = ""

// リスナ
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // console.log(sender.tab ?
  //     "from a content script:" + sender.tab.url :
  //     "from the extension");
  switch (request.type) {
    case "toggle_switch":
      if (request.flag) {
        turnOn();
      } else {
        turnOff();
      }
      break;
    case "redo":
      redoElm(request);
      break;
    case "redo_all":
      allredo();
      break;
    default:
      console.log(`Unknown type: ${request.type}`);
  }
});

/** 機能ON */
function turnOn() {
  addEvent();
  addCss();
  backupUserSelectAndToNone();
}

/** 機能OFF */
function turnOff() {
  removeEvent();
  removeCss();
  restoreUserSelect(window);
}

/** クリックイベントの追加とiframeのイベント追加 */
function addEvent() {
  window.addEventListener("click", clickhandler, true);
  window.addEventListener('blur', blurHandler, true);
  
  // ここからiframeの処理、iframeに該当するもの全部拾ってイベントセットする
  if (!window.addedIframeEvent) {
    window.addedIframeEvent = true;
    const iframes = searchIframes(document);
    const pref = getRandomPref();
    for (let i = 0, l = iframes.length; i < l; i++) {
      const clsid = getUniqID(pref);
      iframes[i].classList.add(clsid);
      // このイベント消すのめんどいのでそのままにするつもり
      iframes[i].addEventListener("mouseover", () => {window.mouseOverIframeClsName = clsid});
      iframes[i].addEventListener("mouseout", () => {window.mouseOverIframeClsName = ""});
    }
  }
}

const styleElmID = "clickElmRemover-style-id";
/** 必要なCSSを追加する */
function addCss() {
  let styleEl = document.getElementById(styleElmID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleElmID;
    document.head.appendChild(styleEl);
    const styleSheet = styleEl.sheet;
    styleSheet.insertRule("iframe{pointer-events:none;}");
  }
  // すでにスタイルがあるならそれでいいのでなにもしない
}

/** クリックイベントのみ削除(iframeイベントの削除が冗長になる割に見返り少ないため) */
function removeEvent() {
  window.removeEventListener("click", clickhandler, true);
  window.removeEventListener("click", blurHandler, true);
}

/** CSSを除去する */
function removeCss() {
  let styleEl = document.getElementById(styleElmID);
  if(styleEl) {
    styleEl.parentNode.removeChild(styleEl);
  }
  // 既にスタイルがないならそれでいいのでなにもしない
}

/** iframeのコンテナ要素を洗い出す */
function searchIframes(elm) {
  /** iframeを格納している要素群 */
  let result = [];
  if (elm.tagName === "IFRAME") {
    return [elm];
  }
  const children = elm.children;
  if (children.length > 0) {
    for (let i = 0, l = children.length;i<l;i++) {
      Array.prototype.push.apply(result, searchIframes(children[i]));
    }
  }
  return result;
}

/** bodyのuserSelectの値をバックアップしておいてnoneに設定 */
function backupUserSelectAndToNone() {
  if (window.backupUserSelect === undefined) {
    window.backupUserSelect = window.document.body.style.userSelect;
  }
  window.document.body.style.userSelect = "none";
}

/** bodyのuserSelectを戻す */
function restoreUserSelect(w) {
  if (w.backupUserSelect !== undefined){
    w.document.body.style.userSelect = w.backupUserSelect;
  }
  // バックアップない場合はなにもしない
}

/** クリック時のイベントハンドラ */
function clickhandler(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.shiftKey) {
    // redo
    chrome.runtime.sendMessage({ type: "getRedo" }, function(response) {
      if (response) {
        redoElm(response);
      } else {
        window.alert("no more history");
      }
    });
  } else {
    // remove
    const o = removeElm(e.target);
    o.type = "remove"; // メッセージのタイプを挿入
    chrome.runtime.sendMessage(o);
  }
  return false;
}

function blurHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.shiftKey) {
    // redo
    chrome.runtime.sendMessage({ type: "getRedo" }, function(response) {
      if (response) {
        redoElm(response);
      } else {
        window.alert("no more history");
      }
    });
  } else {
    // remove
    // 削除対象がiframeかどうかを判別してターゲットを変える
    if (window.mouseOverIframeClsName !== "") {
      const elm = document.getElementsByClassName(window.mouseOverIframeClsName)[0]
      const o = removeElm(elm);
      o.type = "remove"; // メッセージのタイプを挿入
      chrome.runtime.sendMessage(o);
    }
  }
}

/** 指定Elementを消す */
function removeElm(target) {
  const myIDClass = getUniqID("idclsForCER");
  target.classList.add(myIDClass); // このスクリプト内でIDとして利用するクラスを追加する
  const dispBack = target.style.display;
  target.style.display = "none";
  return { idcls: myIDClass, dispBack: dispBack };
}

/** 消していたElementを再表示する */
function redoElm(obj) {
  const elm = document.getElementsByClassName(obj.idcls)[0]; // ID(class)からElementをひっぱり
  if (elm) {
    elm.style.display = obj.dispBack; // displayを戻して
    elm.classList.remove(obj.idcls); // ID(class)を消す
  }
  // ない場合は無視
}

/** ランダムな文字列を渡す */
function getUniqID(pref) {
  return `${pref}_${Math.floor(Math.random() * 1000000)}_${Date.now()}`;
}

/** 4～10文字のランダム文字列を返す */
function getRandomPref() {
  const l = 4 + Math.floor(Math.random() * 7);
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cl = c.length;
  let r = "";
  for(var i=0; i<l; i++){
    r += c[Math.floor(Math.random()*cl)];
  }
  return r;
}