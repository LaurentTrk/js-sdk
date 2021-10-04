console.log('[PhaPass] is here :)');
const allPasswordFields = document.querySelectorAll("input[type='password']");

allPasswordFields.forEach(passwordField => {
    console.log('[PhaPass] Found password !');
    console.debug('[PhaPass] Password is :',passwordField);
    console.debug('[PhaPass] Form is :',passwordField.form);
    console.debug('[PhaPass] Inputs :',passwordField.form.getElementsByTagName("input"));

    // TODO : assume first inputs is username
    const form_inputs = passwordField.form.getElementsByTagName("input");
    const usernameField = form_inputs[0];


    chrome.runtime.sendMessage({command: "get"}, function(response) {
        if (response.hasOwnProperty('userName')){ 
            console.log('[PhaPass] Setting credential');
            usernameField.value = response.userName;
            passwordField.value = response.password;
        }else{
            console.log('[PhaPass] Hacking submit');
            const originalFormSubmitFunction = passwordField.form.onsubmit;
            passwordField.form.onsubmit = function() {
                console.log('[PhaPass] OnSubmit', originalFormSubmitFunction);
                chrome.runtime.sendMessage({command: "set", username: usernameField.value, password: passwordField.value}, function(response) {
                });      
                if (originalFormSubmitFunction){
                    return originalFormSubmitFunction();
                }      
                
              };
        }
    });

});
