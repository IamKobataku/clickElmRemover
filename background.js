chrome.runtime.onInstalled.addListener(function () {
    console.log("on install");
    chrome.storage.local.set({ flag: false }, function () {
        console.log("flag");
    });
});
chrome.browserAction.onClicked.addListener(toggleAndAction);
chrome.commands.onCommand.addListener(function (command) {
    switch (command) {
        case "toggle_switch":
            toggleAndAction();
            break;
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
    sendMessage(true)
}

/** 通常モードへ */
function modeToNormal() {
    sendMessage(false);
}

function sendMessage(flag) {
    chrome.tabs.query({ active: true }, function (tab) {
        chrome.tabs.sendMessage(tab[0].id, { flag: flag }, function (response) {
            console.log(`sendMessage callback: ${response.farewell}`);
        });
    })
}


/** 通ってるか確認するためのメソッド。最後は消す */
function debugMethod(str) {
    window.alert(str);
}