/**
 * Created by binartist on 9/15/16.
 */

var action_btn = document.querySelector('#deliver_btn')
var intranetid_input = document.querySelector('#intranetId');
var password_input = document.querySelector('#password');
var eye = document.querySelector('#eye');
var eye_path = document.querySelector('#eye-path');
var eye_circle = document.querySelector('#eye-circle');
var hint_label = document.querySelector('p');

var hint_container = document.querySelector('#hint-container-fake');
var fading_circle = document.querySelector('.sk-fading-circle');

var homepage_btn = document.querySelector('.homepage_btn');
var webpage_btn = document.querySelector('.webpage_btn');

eye.onclick = function () {
    if (password_input.type == "text") {
        password_input.type = "password";
        eye_path.style.fill = "black";
        eye_circle.style.fill = "black";
    }
    else {
        password_input.type = "text";
        eye_path.style.fill = "grey";
        eye_circle.style.fill = "grey";
    }
}

homepage_btn.onclick = function () {
    chrome.tabs.create({url:"https://github.com/binartist/claim-gatherer-webextension"});
}

webpage_btn.onclick = function () {
    chrome.tabs.create({url:"https://cybergear.io/claim-gatherer"});
}

action_btn.onclick = function () {
    if (!intranetid_input.value || !password_input.value) {
        hint_label.textContent = "The input field can't be empty";
        hint_label.style.color = "red";

        return;
    }

    showHub();

    var user_info = {
        username: intranetid_input.value,
        password: password_input.value,
    };

    chrome.storage.local.set({
        user_info: user_info
    });

    chrome.runtime.sendMessage({
        username: user_info.username,
        password: user_info.password
    }, function (code, msg) {
        chrome.storage.local.get('last_update', function (res) {
            hideHub();

            hint_label.textContent = res.last_update.msg + res.last_update.datatime;
            hint_label.style.color = "black";
        });
    });
}

chrome.storage.local.get('user_info', function (res) {
    intranetid_input.value = res.user_info.username;
    password_input.value = res.user_info.password;
});

chrome.storage.local.get('last_update', function (res) {
    hint_label.textContent = (res.last_update.msg + res.last_update.datatime) || hint_label.textContent;
});

function showHub() {
    fading_circle.style.display = "block";
    hint_container.style.display = "none";
}

function hideHub() {
    setTimeout(function () {
        fading_circle.style.display = "none";
        hint_container.style.display = "block";
    }, 1500)
}

