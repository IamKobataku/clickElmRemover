// インストール時にフラグを初期化する
chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.set({ flag: false });
    modeToNormal();
});
// ボタンクリックで切り替え
chrome.browserAction.onClicked.addListener(toggleAndAction);

// コマンドリスナ
chrome.commands.onCommand.addListener(function (command) {
    switch (command) {
        case "toggle_switch":
            toggleAndAction();
            break;
        case "redo_all":
            sendMessage({ type: "redo_all" });
        default:
            console.log(`Unknown command: ${command}`);
    }
});

function toggleAndAction() {
    // 今のフラグを取得して反転させて
    chrome.storage.local.get(['flag'], function (result) {
        const updateFlag = !result.flag
        chrome.storage.local.set({ flag: updateFlag }, function () {
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
    sendMessage({ type: "toggle_switch", flag: true })
}

/** 通常モードへ */
function modeToNormal() {
    chrome.browserAction.setBadgeText({ text: "OFF" });
    chrome.browserAction.setBadgeBackgroundColor({ color: [128, 128, 128, 100] });
    sendMessage({ type: "toggle_switch", flag: false });
}

/** メッセージ送信 */
function sendMessage(attr) {
    chrome.tabs.query({ active: true }, function (tab) {
        chrome.tabs.sendMessage(tab[0].id, attr);
    })
}


/** 通ってるか確認するためのメソッド。最後は消す */
function debugMethod(str) {
    window.alert(str);
}