export function installMessageListener(onMessageCallback){
    chrome.runtime.onMessage.addListener(onMessageCallback);
}

export function sendNotification(message){
    chrome.notifications.create('test', {title: 'PhaPass', iconUrl: 'phala-34.png', message: message, type: 'basic', requireInteraction: false});
}

export async function sendLengthyNotification(message){
    const notificationPromise = new Promise((resolve) => {
        chrome.notifications.create({title: 'PhaPass', iconUrl: 'phala-34.png', message: message, type: 'basic', requireInteraction: true}, 
            (notificationId) => {
                resolve(notificationId)
        });
    })
    return await notificationPromise;
}

export function closeNotification(notificationId){
    chrome.notifications.clear(notificationId)
}

export function openOptionsPage(){
    chrome.runtime.openOptionsPage();
}

export function connectExtension(extensionId){
    return chrome.runtime.connect(extensionId);
}

export function sendMessage(message, callBack){
    return chrome.runtime.sendMessage(message, callBack);
}

export function enableOptionsPageDisplayOnButtonClick(){
    chrome.browserAction.onClicked.addListener(function () {
        chrome.tabs.create({ url: chrome.runtime.getURL("phapass.html") });
    })
}
