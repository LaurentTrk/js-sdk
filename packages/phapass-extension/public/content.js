console.log('[PhaPass] is here :)');

const phalaIconBase64 = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAB3RJTUUH5QoKEBI6DY7SRQAAAbNJREFUOMutlT1LI1EUhp/7MZlEXAUbFwRrSwu1kpXgD9Bm/4GCWywLFv4GBcHCTsRm18bCYnexFLXTyBbiR6tpsilWBM3EmJk7NjeTSZzxa/PCYeCeD8553zP3CuAjsAaMABlAAdKasBZHaM3YbwA8AMfALMDPWND/2m+AUgcLlrUdE4CMq5hfGkFpw7Mwko3lU0rFSrvH0ZYzALo+ZPg8N4h2g2frhYFiZ+syqaDWlvyI7zDmFZEeYVueiB2JuF+2FWziolDj1/erlB4Fiz8mcLKGs0OPr9M7kUMnrAUAXqXO5upZQnegs5JvS0O4OUNPX2u6pMPQLWSHUPMUgQ/GV4zlB5IHFoKaJ8Ao6vdP2KUCdEWrk5MgYHlznImp/mSVjWJmcp+TozLGB78erZmn24Mfqg2nARGkaYIJTSw2ZeRct8Pqdh6VCbi/ddjdvk7pUPCvXE3lMJLRzSqGP/Wi3YA/e3d8yR8kqpy8m82CJmGi5thvQyhbsxr/hkhbz5dgtL3PALi9qbGycI5UIX+L1fcU9Dt+fUl703YKBWGfgHVgFHCsUPIVJDaeAR+oAwVg9hHSaL9X3Ba9LwAAAABJRU5ErkJggg==')"

const addPhalaLogoToField = (field) => {
    field.style["background-image"]= phalaIconBase64
    field.style["background-size"]= "20px"
    field.style["background-position"]= "98% 50%"
    field.style["background-repeat"]= "no-repeat"
}
    
const allPasswordFields = document.querySelectorAll("input[type='password']");

allPasswordFields.forEach(passwordField => {
    console.log('[PhaPass] Found password !');
    console.debug('[PhaPass] Password is :',passwordField);
    console.debug('[PhaPass] Form is :',passwordField.form);
    console.debug('[PhaPass] Inputs :',passwordField.form.getElementsByTagName("input"));

    // TODO : assume first inputs is username
    const form_inputs = passwordField.form.getElementsByTagName("input");
    const usernameField = form_inputs[0];

    addPhalaLogoToField(usernameField);
    addPhalaLogoToField(passwordField);

    chrome.runtime.sendMessage({command: "get"}, function(response) {
        console.log('[PhaPass] response', response)
        if (response.hasOwnProperty('username')){ 
            console.log('[PhaPass] Setting credential');
            usernameField.value = response.username;
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
