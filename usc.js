async function readUSC(file) {
    const reader = new FileReader();
    reader.readAsText(file);
    await new Promise(resolve => reader.onload = resolve);
    const res = JSON.parse(reader.result);
    return res;
}

function isUSC(file) { return (file.name.substr(-4) == '.usc'); }

function isFlick(d) { return (d == 'left' || d == 'up' || d == 'right'); }