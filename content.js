// 削除するDOMの履歴用オブジェクトをローカルストレージに保管する
chrome.storage.local.set({ domcollection: [] });
// domcollection: {idcls:string, dispBack:string}[]
chrome.storage.local.set({ userSelect: document.body.style.userSelect });

// リスナ
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
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
    const iframes = document.getElementsByTagName("iframe");
    for (let i = 0, l = iframes.length; i < l; i++) {
        addEvent(iframes[i].contentWindow);
    }
    document.body.style.userSelect = "none";
}

/** 機能OFF */
function turnOff() {
    removeEvent(window);
    const iframes = document.getElementsByTagName("iframe");
    for (let i = 0, l = iframes.length; i < l; i++) {
        removeEvent(iframes[i].contentWindow);
    }
    chrome.storage.local.get(['domcollection'], function (result) {
        document.body.style.userSelect = result.userSelect;
    });
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
    chrome.storage.local.get(['domcollection'], function (result) {
        const col = result.domcollection;
        if (e.shiftKey) { // redo
            const obj = col.pop();
            if (obj) {
                redoElm(obj);
            } else {
                window.alert("no more history")
            }
        } else { // remove
            const myIDClass = getUniqID("idclsForCER");
            const elm = e.target;
            elm.classList.add(myIDClass); // このスクリプト内でIDとして利用するクラスを追加する
            const dispBack = elm.style.display;
            col.push({ idcls: myIDClass, dispBack: dispBack });
            elm.style.display = "none";
        }
        chrome.storage.local.set({ domcollection: col });
    })
    return false;
}

function redoElm(obj) {
    const elm = document.getElementsByClassName(obj.idcls)[0]; // ID(class)からElementをひっぱり
    if (elm) {
        elm.style.display = obj.dispBack; // displayを戻して
        elm.classList.remove(obj.idcls); // ID(class)を消す
    }
    // ない場合は無視
}

/** 全戻し */
function allredo() {
    chrome.storage.local.get(['domcollection'], function (result) {
        const col = result.domcollection;
        for (let o = col.pop(); o; o = col.pop()) {
            redoElm(o);
        }
        chrome.storage.local.set({ domcollection: [] });
    });
}

/** ランダムな文字列を渡す */
function getUniqID(pref) {
    return `${pref}_${Math.floor(Math.random() * 1000000)}_${Date.now()}`
}