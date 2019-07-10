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
  addEvent(window);
  backupUserSelectAndToNone(window);
  const iframes = document.getElementsByTagName("iframe");
  for (let i = 0, l = iframes.length; i < l; i++) {
    addEvent(iframes[i].contentWindow);
    backupUserSelectAndToNone(iframes[i].contentWindow)
  }
}

/** 機能OFF */
function turnOff() {
  removeEvent(window);
  restoreUserSelect(window);
  const iframes = document.getElementsByTagName("iframe");
  for (let i = 0, l = iframes.length; i < l; i++) {
    removeEvent(iframes[i].contentWindow);
    restoreUserSelect(iframes[i].contentWindow)
  }
}

function backupUserSelectAndToNone(w) {
  if (w.backupUserSelect === undefined) {
    w.backupUserSelect = w.document.body.style.userSelect;
  }
  w.document.body.style.userSelect = "none";
}

function restoreUserSelect(w) {
  if (w.backupUserSelect !== undefined){
    w.document.body.style.userSelect = w.backupUserSelect;
  }
  // バックアップない場合は無理しない
}

function addEvent(w) {
  w.addEventListener("click", clickhandler, true);
}

function removeEvent(w) {
  w.removeEventListener("click", clickhandler, true);
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
