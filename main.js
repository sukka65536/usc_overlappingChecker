$(function () {

    console.log('ひづけ：2024/06/21');
    console.log('こーど：https://github.com/sukka65536/usc_overlappingChecker');

    let uscInput;

    //ファイルボタンが押されたら本来のinputを発火
    $('#file-input').on('click', function () { $('#file-input-hide').trigger('click'); });

    //usc読み込み処理
    $('#file-input-hide').on('change', function (e) {
        const files = e.target.files;
        if (files.length === 0) return;

        //拡張子がuscならuscInputにuscを格納
        if (files[0].name.substr(-4) === '.usc') {
            const reader = new FileReader();
            reader.onload = () => {
                uscInput = JSON.parse(reader.result);
                console.log(JSON.parse(reader.result));
            };
            reader.readAsText(files[0]);
            $('#file-input-error').text('');
            $('#download, #check-btn').addClass('can-click');
        }
        //uscでなければ警告文を表示
        else {
            $('#file-input-error').text('uscファイルを選択してください');
            $('#download, #check-btn').removeClass('can-click');
        }

        //ファイル名とファイルサイズを表示
        let fileSize = files[0].size, sizeUnit = 'B';
        if (fileSize >= 1048576) { fileSize = Math.round(fileSize / (2 ** 20) * 100) / 100, sizeUnit = 'MB'; }
        else if (fileSize >= 1024) { fileSize = Math.round(fileSize / (2 ** 10) * 100) / 100, sizeUnit = 'KB'; }
        $('#file-info').text(files[0].name + ' ( ' + fileSize + ' ' + sizeUnit + ' )');
    });

    //チェック実行ボタンが押されたらusc分解処理を開始
    $('#check-btn').on('click', function () {
        if ($(this).hasClass('can-click')) {
            const detectionTargets = readConfig();
            const readerResult = readUsc(uscInput, detectionTargets);
            console.log(readerResult);
            const checkerResult = checkOverlapping(readerResult);
            console.log(checkerResult);
            printCheckerResult(checkerResult);
        }
    });

    //全選択/全解除処理
    $('.select-all').on('click', function () {
        $('input[name="' + $(this).attr('id') + '"]').prop('checked', $(this).prop('checked'));
    });

    //親チェックボックスと子チェックボックスの連携
    $('.select-btn').on('click', function () {
        const elem = $('.select-btn[name="' + $(this).attr('name') + '"]');
        let bool = false;
        for (i = 0; i < elem.length; i++) if (elem.eq(i).prop('checked')) bool = true;
        $('#' + $(this).attr('name')).prop('checked', bool);
    });


    //uscダウンロード処理
    /*
    $('#download').on('click', function () {
        if ($(this).hasClass('can-click')) {
            const blob = new Blob([uscOutput], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            $('<a href="' + url + '" download="' + $('#name-input-' + $(this).attr('value')).text() + '.usc"></a>')[0].click();
            URL.revokeObjectURL(url);
        }
    });
    */
});

const ids = ['nn', 'nf', 'nt', 'ns', 'nd', 'sn', 'st', 'sx', 'en', 'ef', 'et', 'ex', 'tv', 'tu', 'ta', 'gm'];

function readConfig() {
    let bools = [];
    for (i = 0; i < ids.length; i++) bools[i] = $('#' + ids[i]).prop('checked');
    return bools;
}

//メイン
function readUsc(data, targets) {
    let res = { notes: [] };
    for (i = 0; i < data.usc.objects.length; i++) {
        const obj = data.usc.objects[i];

        switch (obj.type) {

            //タップノーツ・フリックノーツとそのトレース
            case 'single':
                for (j = 0; j < 4; j++) {
                    const trace = (j < 2) ? !obj.trace : obj.trace;
                    const flick = (j % 2 == 0) ? !isFlick(obj.direction) : isFlick(obj.direction);
                    if (targets[j] && trace && flick) addNote(res, obj.beat, obj.lane, obj.size, ids[j]);
                }
                break;

            //ダメージノーツ
            case 'damage':
                if (targets[4]) addNote(res, obj.beat, obj.lane, obj.size, ids[4]);
                break;

            //スライドノーツ
            case 'slide':
                for (j = 0; j < obj.connections.length; j++) {
                    const cnc = obj.connections[j];
                    switch (cnc.type) {

                        //始点
                        case 'start':
                            if (targets[5] && cnc.judgeType == 'normal') addNote(res, cnc.beat, cnc.lane, cnc.size, ids[5]);
                            if (targets[6] && cnc.judgeType == 'trace') addNote(res, cnc.beat, cnc.lane, cnc.size, ids[6]);
                            if (targets[7] && cnc.judgeType == 'none') addNote(res, cnc.beat, cnc.lane, cnc.size, ids[7]);
                            break;

                        //終点
                        case 'end':
                            if (cnc.judgeType == 'normal') {
                                if (targets[8] && !isFlick(cnc.direction)) addNote(res, cnc.beat, cnc.lane, cnc.size, ids[8]);
                                if (targets[9] && isFlick(cnc.direction)) addNote(res, cnc.beat, cnc.lane, cnc.size, ids[9]);
                            }
                            if (targets[10] && cnc.judgeType == 'trace') addNote(res, cnc.beat, cnc.lane, cnc.size, ids[10]);
                            if (targets[11] && cnc.judgeType == 'none') addNote(res, cnc.beat, cnc.lane, cnc.size, ids[11]);
                            break;

                        //可視中継点・不可視中継点
                        case 'tick':
                            if (targets[12] && !cnc.critical) addNote(res, cnc.beat, cnc.lane, cnc.size, ids[12]);
                            if (targets[13] && cnc.critical == undefined) addNote(res, cnc.beat, cnc.lane, cnc.size, ids[13]);
                            break;

                        //無視中継点
                        case 'attach':
                            if (targets[14]) addNote(res, cnc.beat, cnc.lane, cnc.size, ids[14]);
                            break;

                        default:
                            break;
                    }
                }
                break;

            default:
                break;
        }
    }
    return res;
}

function isFlick(direction) {
    if (direction == 'left' || direction == 'up' || direction == 'right') {
        return true;
    } else {
        return false;
    }
}

function addNote(res, beat, lane, size, type) {
    let index = 0;
    const note = {
        beat: beat,
        minLane: lane - size,
        maxLane: lane + size,
        type: type
    }
    for (k = 0; k < res.notes.length; k++) {
        if (note.beat == res.notes[k].beat) {
            if (note.minLane < res.notes[k].minLane) break;
        }
        if (note.beat < res.notes[k].beat) break;
        index++;
    }
    res.notes.splice(index, 0, note);
}

function checkOverlapping(data) {
    let res = [];
    for (i = 0; i < data.notes.length - 1; i++) {
        const note1 = data.notes[i], note2 = data.notes[i + 1];
        if ((note1.beat == note2.beat) && (note1.maxLane > note2.minLane)) {
            res.push([roundNum(note1.beat, 5), note1.type, note2.type]);
        }
    }
    return res;
}

function printCheckerResult(data) {
    $('#result-table').html('');
    if (data.length > 0) {
        $('#result-text').text(data.length + '件検出しました。');
        $('#result-table').append('<tr><th>beat値</th><th>ノーツ種別</th></tr>');
        for (i = 0; i < data.length; i++) {
            $('#result-table').append('<tr><td class="w-30c t-center">' + data[i][0] + '</td><td class="w-70c">'
                + $('label[for="' + data[i][1] + '"]').text() + '<br>'
                + $('label[for="' + data[i][2] + '"]').text() + '</td></tr>');
        }
    } else {
        $('#result-text').text('ノーツの重なりは検出されませんでした。');
    }
}

function roundNum(val, dig) { return Math.round(val * (10 ** dig)) / (10 ** dig); }