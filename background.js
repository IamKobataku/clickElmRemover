// インストール時にフラグを初期化する
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.set({ flag: false });
  // 削除するDOMの履歴用オブジェクトをローカルストレージに保管する
  chrome.storage.local.set({ domcollection: {} }); // domcollection: [tabid:number]: {idcls:string, dispBack:string}[]
  modeToNormal();
});
// ボタンクリックで切り替え
chrome.browserAction.onClicked.addListener(() => modeSet(true));
// タブの変更を検知する
chrome.tabs.onActivated.addListener(() => modeSet(false));
// タブの更新(画面遷移とか)を検知する
chrome.tabs.onUpdated.addListener(() => modeSet(false));

// コマンドリスナ
chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
    case "toggle_switch":
      toggleAndAction();
      break;
    case "remove":
      break;
    case "redo":
      break;
    case "redo_all":
      allRedo();
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
});

/** モードを再セットする @param toggle 現在のモードと反転するか、そのまま通知するかのフラグ */
function modeSet(toggle) {
  chrome.storage.local.get(["flag"], function(result) {
    const updateFlag = toggle ? !result.flag : result.flag;
    chrome.storage.local.set({ flag: updateFlag }, function() {
      if (updateFlag) {
        modeToRemove();
      } else {
        modeToNormal();
      }
    });
  });
}

/** 削除モードへ */
function modeToRemove() {
  chrome.browserAction.setBadgeText({ text: "ON" });
  chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 100] });
  sendMessage({ type: "toggle_switch", flag: true });
}

/** 通常モードへ */
function modeToNormal() {
  chrome.browserAction.setBadgeText({ text: "OFF" });
  chrome.browserAction.setBadgeBackgroundColor({ color: [128, 128, 128, 100] });
  sendMessage({ type: "toggle_switch", flag: false });
}

/** 全て戻す */
function allRedo() {
  chrome.tabs.query({ active: true }, function(tab) {
    const tabid = tab[0].id;
    chrome.storage.local.get(["domcollection"], function(dc) {
      const col = dc.domcollection[tabid];
      for (let o = col.pop(); o; o = col.pop()) {
        redoElm(o);
      }
      chrome.storage.local.set({ domcollection: [] });
    });
  });
}

/** エレメントを戻すのをcontent scriptの方に依頼する */
function redoElm(o) {
  o.type = "redo";
  sendMessage(o);
}

// content scriptからのイベントを記録する
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.type) {
    case "remove":
      memoryRemoveHist(request, sender.tab.id);
      break;
    case "getRedo":
      takeRedoObj(sender.tab.id, sendResponse);
      break;
    default:
      console.log(`Unknown type: ${request.type}`);
  }
  return true;
});

/** 削除情報を記録 */
function memoryRemoveHist(o, tabid) {
  chrome.storage.local.get(["domcollection"], function(dc) {
    let col = dc.domcollection[tabid];
    if (!col) {
      col = [];
    }
    col.push({ idcls: o.idcls, dispBack: o.dispBack });
    dc.domcollection[tabid] = col;
    chrome.storage.local.set({ domcollection: dc.domcollection });
  });
}

/** 最後にpushされたdom情報を返却する */
function takeRedoObj(tabid, sendResponse) {
  chrome.storage.local.get(["domcollection"], function(dc) {
    const col = dc.domcollection[tabid];
    let result = null;
    if (col) {
      result = col.pop();
    }
    sendResponse(result);
    chrome.storage.local.set({ domcollection: dc.domcollection });
  });
}

/** メッセージ送信 */
function sendMessage(attr) {
  chrome.tabs.query({ active: true }, function(tab) {
    chrome.tabs.sendMessage(tab[0].id, attr);
  });
}

/** 通ってるか確認するためのメソッド。最後は消す */
function debugMethod(str) {
  window.alert(str);
}
