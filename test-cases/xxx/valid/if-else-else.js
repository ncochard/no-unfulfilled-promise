//try using statement blocks
new Promise(function(resolve, reject) {
    if(x) {
        resolve();
    } else if(y) {
        reject();
    } else {
        reject();
    }
});