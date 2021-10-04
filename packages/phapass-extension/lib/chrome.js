export function installMessageListener(onMessageCallback){
    chrome.runtime.onMessage.addListener(onMessageCallback);
}

export function sendNotification(message){
    chrome.notifications.create('test', {title: 'PhaPass', iconUrl: 'phala-34.png', message: message, type: 'basic'});
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
