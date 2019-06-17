// 削除するDOMの履歴用オブジェクトをローカルストレージに保管する
chrome.storage.local.set({ domcollection: [] }, function () {
    console.log("domcollection");
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.flag) {
            window.addEventListener("click", clickhandler);
        } else {
            window.removeEventListener("click", clickhandler);
        }
        sendResponse({ farewell: "200 OK" });
    });

/** クリック時のイベントハンドラ */
function clickhandler(e) {
    chrome.storage.local.get(['domcollection'], function (result) {
        const col = result.domcollection;
        if (e.shiftKey) { // シフトキーおしてるので一つ戻す
            const obj = col.pop();
            if (obj) {
                const elm = document.getElementsByClassName(obj.idcls)[0]; // ID(class)からElementをひっぱり
                if (elm) {
                    elm.style.display = obj.dispBack; // displayを戻して
                    elm.classList.remove(obj.idcls); // ID(class)を消す
                }
                // ない場合は無視
            } else {
                window.alert("もうストックないですよ")
            }
        } else { // 消す
            const myIDClass = getUniqID("idcls");
            const elm = e.target;
            elm.classList.add(myIDClass); // このスクリプト内でIDとして利用するクラスを追加する
            const dispBack = elm.style.display;
            col.push({ idcls: myIDClass, dispBack: dispBack });
            elm.style.display = "none";
        }
        chrome.storage.local.set({ domcollection: col }, function () {
            console.log("end click handler")
        });
    })
}

/** ランダムな文字列を渡す */
function getUniqID(pref) {
    return `${pref}_${Math.floor(Math.random() * 1000000)}_${Date.now()}`
}