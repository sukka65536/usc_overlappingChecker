$(function () {

    console.log('ひづけ：2024/07/08');
    console.log('こーど：https://github.com/sukka65536/usc_overlappingChecker');
    console.log('りんく：'
        + '\n    すっかぁ自作ツール ：https://sukka65536.github.io/usc_tools/'
        + '\n    usc重なりチェッカー：https://sukka65536.github.io/usc_overlappingChecker/');

    let inputUSC;

    //ファイルボタンが押されたら本来のinputを発火
    $('#file-input').on('click', function () { $('#file-input-hide').trigger('click'); });

    //usc読み込み処理
    $('#file-input-hide').on('change', function (e) {
        const files = e.target.files;
        if (files.length === 0) return;

        //拡張子がuscならinputUSCにuscを格納
        if (isUsc(files[0])) {
            const reader = new FileReader();
            reader.readAsText(files[0]);
            reader.onload = () => {
                inputUSC = JSON.parse(reader.result);
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
            const filteredUSC = filterUSC(inputUSC, detectionTargets);
            //console.log(filteredUSC);
            const readerResult = readUSC(filteredUSC);
            const OLcheckerResult = checkOverlapping(readerResult);
            //console.log(OLcheckerResult);
            const ALcheckerResult = checkAlignment(readerResult);
            //console.log(ALcheckerResult);
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
        for (let i = 0; i < elem.length; i++) if (elem.eq(i).prop('checked')) bool = true;
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
    for (let i = 0; i < ids.length; i++) res[i] = $('#' + ids[i]).prop('checked');
    return res;
}

function filterUSC(data, targets) {
    let res = { objects: [] }
    for (let i = 0; i < data.usc.objects.length; i++) {
        const obj = data.usc.objects[i];

        //タップノーツ
        if (targets[0] && obj.type == 'single' && !obj.trace && !isFlick(obj.direction)) addObj(res, obj, 0);

        //フリックノーツ
        if (targets[1] && obj.type == 'single' && !obj.trace && isFlick(obj.direction)) addObj(res, obj, 1);

        //トレースノーツ
        if (targets[2] && obj.type == 'single' && obj.trace && !isFlick(obj.direction)) addObj(res, obj, 2);

        //トレースフリックノーツ
        if (targets[3] && obj.type == 'single' && obj.trace && isFlick(obj.direction)) addObj(res, obj, 3);

        //ダメージノーツ
        if (targets[4] && obj.type == 'damage') addObj(res, obj, 4);

        //スライドノーツ
        if (obj.type == 'slide') {
            for (let j = 0; j < obj.connections.length; j++) {
                const cnc = obj.connections[j];

                //スライド通常始点ノーツ
                if (targets[5] && cnc.type == 'start' && cnc.judgeType == 'normal') addObj(res, cnc, 5);

                //スライド始点トレースノーツ
                if (targets[6] && cnc.type == 'start' && cnc.judgeType == 'trace') addObj(res, cnc, 6);

                //スライド始点なし
                if (targets[7] && cnc.type == 'start' && cnc.judgeType == 'none') addObj(res, cnc, 7);

                //スライド通常終点ノーツ
                if (targets[8] && cnc.type == 'end' && cnc.judgeType == 'normal' && !isFlick(cnc.direction)) addObj(res, cnc, 8);

                //スライド終点フリックノーツ
                if (targets[9] && cnc.type == 'end' && cnc.judgeType == 'normal' && isFlick(cnc.direction)) addObj(res, cnc, 9);

                //スライド終点トレースノーツ
                if (targets[10] && cnc.type == 'end' && cnc.judgeType == 'trace') addObj(res, cnc, 10);

                //スライド終点なし
                if (targets[11] && cnc.type == 'end' && cnc.judgeType == 'none') addObj(res, cnc, 11);

                //スライド可視中継点
                if (targets[12] && cnc.type == 'tick' && !cnc.critical) addObj(res, cnc, 12);

                //スライド不可視中継点
                if (targets[13] && cnc.type == 'tick' && cnc.critical == undefined) addObj(res, cnc, 13);

                //スライド無視中継点
                if (targets[14] && cnc.type == 'attach') addObj(res, cnc, 14);
            }
        }

        //ガイドノーツ
        if (obj.type == 'guide') {
            for (let j = 0; j < obj.midpoints.length; j++) {
                const mdp = obj.midpoints[j];

                //ガイド始点/中継点/終点
                if (targets[15]) addObj(res, mdp, 15);
            }
        }
    }
    return res;
}

function addObj(res, obj, index) {
    obj.id = ids[index];
    res.objects.push(obj);
}

//メイン
function readUSC(data) {
    let res = { notes: [] }
    for (let i = 0; i < data.objects.length; i++) {
        const obj = data.objects[i];
        for (let j = 0; j < ids.length; j++) {
            if (obj.id == ids[j]) addNote(res, obj.beat, obj.lane, obj.size, ids[j]);
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
    for (let i = 0; i < data.notes.length - 1; i++) {
        const note1 = data.notes[i], note2 = data.notes[i + 1];
        if ((note1.beat == note2.beat) && (note1.maxLane > note2.minLane)) {
            res.push([roundNum(note1.beat, 5), note1.type, note2.type]);
        }
    }
    return res;
}

//ノーツのズレを検出
function checkAlignment(data) {
    let res = [];
    for (let i = 0; i < data.notes.length; i++) {
        const note = data.notes[i];
        if (Math.round(note.beat * 480) % 5 != 0) {
            res.push([roundNum(note.beat, 5), note.type])
        }
    }
    return res;
}

//結果を出力
function printCheckerResult(OLdata, ALdata) {
    $('.result-table').html('');
    if (OLdata.length > 0) {
        $('#result-text-0').text('ノーツの重なりを' + OLdata.length + '件検出しました。');
        $('#result-table-0').append('<tr><th>beat値</th><th>ノーツ種別</th></tr>');
        for (let i = 0; i < OLdata.length; i++) {
            $('#result-table-0').append('<tr><td class="w-30c t-center">' + OLdata[i][0] + '</td><td class="w-70c">'
                + $('label[for="' + OLdata[i][1] + '"]').text() + '<br>'
                + $('label[for="' + OLdata[i][2] + '"]').text() + '</td></tr>');
        }
    } else {
        $('#result-text-0').text('ノーツの重なりは検出されませんでした。');
    }
    if (ALdata.length > 0) {
        $('#result-text-1').text('ノーツのズレを' + ALdata.length + '件検出しました。');
        $('#result-table-1').append('<tr><th>beat値</th><th>ノーツ種別</th></tr>');
        for (let i = 0; i < ALdata.length; i++) {
            $('#result-table-1').append('<tr><td class="w-30c t-center">' + roundNum(ALdata[i][0], 5) + '</td><td class="w-70c">'
                + $('label[for="' + ALdata[i][1] + '"]').text() + '</td></tr>');
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