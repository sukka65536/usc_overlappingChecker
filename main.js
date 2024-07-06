$(function () {

    console.log('ひづけ：2024/07/06');
    console.log('こーど：https://github.com/sukka65536/usc_overlappingChecker');
    console.log('りんく：'
        + '\n    すっかぁ自作ツール ：https://sukka65536.github.io/usc_tools/'
        + '\n    usc重なりチェッカー：https://sukka65536.github.io/usc_overlappingChecker/');

    let uscInput;

    //ファイルボタンが押されたら本来のinputを発火
    $('#file-input').on('click', function () { $('#file-input-hide').trigger('click'); });

    //usc読み込み処理
    $('#file-input-hide').on('change', function (e) {
        const files = e.target.files;
        if (files.length === 0) return;

        //拡張子がuscならuscInputにuscを格納
        if (isUsc(files[0])) {
            const reader = new FileReader();
            reader.readAsText(files[0]);
            reader.onload = () => {
                uscInput = JSON.parse(reader.result);
                console.log(JSON.parse(reader.result));
            };
            $('#file-input-error').text('');
            $('#download, #check-btn').addClass('can-click');
        }
        //uscでなければ怒る
        else {
            $('#file-input-error').text('uscファイルを選択してください');
            $('#download, #check-btn').removeClass('can-click');
        }

        //ファイル名とファイルサイズを表示
        $('#file-info').text(files[0].name + ' ( ' + calcFileSize(files[0].size) + ' )');
    });

    //チェック実行ボタンが押されたらusc分解処理を開始
    $('#check-btn').on('click', function () {
        if ($(this).hasClass('can-click')) {
            const detectionTargets = readConfig();
            const readerResult = readUsc(uscInput, detectionTargets);
            const OLcheckerResult = checkOverlapping(readerResult);
            const ALcheckerResult = checkAlignment(uscInput, detectionTargets);
            console.log(ALcheckerResult);
            printCheckerResult(OLcheckerResult, ALcheckerResult);
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

//各チェックボックスのid
const ids = ['nn', 'nf', 'nt', 'ns', 'nd', 'sn', 'st', 'sx', 'en', 'ef', 'et', 'ex', 'tv', 'tu', 'ta', 'gm'];

//各チェックボックスのチェック状況を確認、配列化
function readConfig() {
    let res = [];
    for (i = 0; i < ids.length; i++) res[i] = $('#' + ids[i]).prop('checked');
    return res;
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

            //ガイドノーツ
            case 'guide':
                for (j = 0; j < obj.midpoints.length; j++) {
                    const mdp = obj.midpoints[j];
                    if (targets[15]) addNote(res, mdp.beat, mdp.lane, mdp.size, ids[15]);
                }
                break;

            default:
                break;
        }
    }
    return res;
}

//uscかどうかを判定
function isUsc(file) { return (file.name.substr(-4) == '.usc'); }

//フリックかどうかを判定
function isFlick(drc) { return (drc == 'left' || drc == 'up' || drc == 'right'); }

//検出対象のノーツをresに追加
function addNote(res, beat, lane, size, type) {
    let index = 0;
    const note = {
        beat: beat,
        lane: lane,
        size: size,
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

//ノーツの重複を検出
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

//結果を出力
function printCheckerResult(data, data2) {
    $('.result-table').html('');
    if (data.length > 0) {
        $('#result-text-0').text('ノーツの重なりを'+ data.length + '件検出しました。');
        $('#result-table-0').append('<tr><th>beat値</th><th>ノーツ種別</th></tr>');
        for (i = 0; i < data.length; i++) {
            $('#result-table-0').append('<tr><td class="w-30c t-center">' + data[i][0] + '</td><td class="w-70c">'
                + $('label[for="' + data[i][1] + '"]').text() + '<br>'
                + $('label[for="' + data[i][2] + '"]').text() + '</td></tr>');
        }
    } else {
        $('#result-text-0').text('ノーツの重なりは検出されませんでした。');
    }
    if (data2.notes.length > 0) {
        $('#result-text-1').text('ノーツのズレを'+ data2.notes.length + '件検出しました。');
        $('#result-table-1').append('<tr><th>beat値</th><th>ノーツ種別</th></tr>');
        for (i = 0; i < data2.notes.length; i++) {
            $('#result-table-1').append('<tr><td class="w-30c t-center">' + roundNum(data2.notes[i].beat, 5) + '</td><td class="w-70c">'
                + $('label[for="' + data2.notes[i].type + '"]').text() + '</td></tr>');
        }
    } else {
        $('#result-text-1').text('ノーツのズレは検出されませんでした。');
    }
}
//数値を任意の桁で四捨五入(数値, 桁数)
function roundNum(val, dig) { return Math.round(val * (10 ** dig)) / (10 ** dig); }

//ファイルサイズを適切な単位に変換
function calcFileSize(size) {
    let units = ['B', 'KB', 'MB', 'GB', 'TB'], unit = 0;
    while (size >= 1024) {
        size /= 1024;
        unit++;
        if (unit == 4) break;
    }
    const res = roundNum(size, 2) + ' ' + units[unit];
    return res;
}

function judge1920(beat) {
    const res = !(roundNum(beat * 384, 2) % 1 == 0);
    return res;
}

function checkAlignment(data, targets) {
    let res = { notes: [] };
    for (i = 0; i < data.usc.objects.length; i++) {
        const obj = data.usc.objects[i];
        const objx = judge1920(obj.beat);

        switch (obj.type) {

            //タップノーツ・フリックノーツとそのトレース
            case 'single':
                for (j = 0; j < 4; j++) {
                    const trace = (j < 2) ? !obj.trace : obj.trace;
                    const flick = (j % 2 == 0) ? !isFlick(obj.direction) : isFlick(obj.direction);
                    if (targets[j] && trace && flick && objx) addNote2(res, obj.beat, ids[j]);
                }
                break;

            //ダメージノーツ
            case 'damage':
                if (targets[4] && objx) addNote2(res, obj.beat, ids[4]);
                break;

            //スライドノーツ
            case 'slide':
                for (j = 0; j < obj.connections.length; j++) {
                    const cnc = obj.connections[j];
                    const cncx = judge1920(cnc.beat);

                    switch (cnc.type) {

                        //始点
                        case 'start':
                            if (targets[5] && cnc.judgeType == 'normal' && cncx) addNote2(res, cnc.beat, ids[5]);
                            if (targets[6] && cnc.judgeType == 'trace' && cncx) addNote2(res, cnc.beat, ids[6]);
                            if (targets[7] && cnc.judgeType == 'none' && cncx) addNote2(res, cnc.beat, ids[7]);
                            break;

                        //終点
                        case 'end':
                            if (cnc.judgeType == 'normal') {
                                if (targets[8] && !isFlick(cnc.direction) && cncx) addNote2(res, cnc.beat, ids[8]);
                                if (targets[9] && isFlick(cnc.direction) && cncx) addNote2(res, cnc.beat, ids[9]);
                            }
                            if (targets[10] && cnc.judgeType == 'trace' && cncx) addNote2(res, cnc.beat, ids[10]);
                            if (targets[11] && cnc.judgeType == 'none' && cncx) addNote2(res, cnc.beat, ids[11]);
                            break;

                        //可視中継点・不可視中継点
                        case 'tick':
                            if (targets[12] && !cnc.critical && cncx) addNote2(res, cnc.beat, ids[12]);
                            if (targets[13] && cnc.critical == undefined && cncx) addNote2(res, cnc.beat, ids[13]);
                            break;

                        //無視中継点
                        case 'attach':
                            if (targets[14] && cncx) addNote2(res, cnc.beat, ids[14]);
                            break;

                        default:
                            break;
                    }
                }
                break;

            //ガイドノーツ
            case 'guide':
                for (j = 0; j < obj.midpoints.length; j++) {
                    const mdp = obj.midpoints[j];
                    const mdpx = judge1920(mdp.beat);

                    if (targets[15] && mdpx) addNote2(res, mdp.beat, ids[15]);
                }
                break;

            default:
                break;
        }
    }
    return res;
}

function addNote2(res, beat, type) {
    let index = 0;
    const note = {
        beat: beat,
        type: type
    }
    for (k = 0; k < res.notes.length; k++) {
        if (note.beat < res.notes[k].beat) break;
        index++;
    }
    res.notes.splice(index, 0, note);
}