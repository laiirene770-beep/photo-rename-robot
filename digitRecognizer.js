/* ======================================
   Photo Rename Robot V7
   digitRecognizer.js
====================================== */

/* 將 Canvas 轉成 5×7 二值矩陣 */
function canvasToMatrix(canvas){

    const tiny = document.createElement("canvas");
    tiny.width = 5;
    tiny.height = 7;

    const tctx = tiny.getContext("2d",{willReadFrequently:true});
    tctx.drawImage(canvas,0,0,5,7);

    const img = tctx.getImageData(0,0,5,7).data;

    const matrix=[];

    for(let y=0;y<7;y++){

        let row="";

        for(let x=0;x<5;x++){

            const i=(y*5+x)*4;

            const v=img[i];

            row += v<128 ? "1":"0";

        }

        matrix.push(row);

    }

    return matrix;

}

/* 比對模板 */

function compareTemplate(matrix,template){

    let score=0;

    for(let y=0;y<7;y++){

        for(let x=0;x<5;x++){

            if(matrix[y][x]===template[y][x]){
                score++;
            }

        }

    }

    return score;

}

/* 單一數字 */

function recognizeDigit(canvas){

    const matrix=canvasToMatrix(canvas);

    let best="0";
    let bestScore=-1;

    for(const digit in DIGITS){

        const score=compareTemplate(
            matrix,
            DIGITS[digit]
        );

        if(score>bestScore){

            bestScore=score;
            best=digit;

        }

    }

    return best;

}

/* 切成固定格數 */

function splitDigits(canvas,count){

    const arr=[];

    const gap=2;

    const digitWidth=
        Math.floor(
            (canvas.width-gap*(count-1))/count
        );

    for(let i=0;i<count;i++){

        const c=document.createElement("canvas");
        c.width=digitWidth;
        c.height=canvas.height;

        const ctx=c.getContext("2d");

        const x=i*(digitWidth+gap);

        ctx.drawImage(
            canvas,
            x,
            0,
            digitWidth,
            canvas.height,
            0,
            0,
            digitWidth,
            canvas.height
        );

        arr.push(c);

    }

    return arr;

}

/* 5碼 */

function recognizeFiveDigits(canvas){

    const digits=splitDigits(canvas,5);

    return digits
        .map(recognizeDigit)
        .join("");

}

/* 6碼 */

function recognizeSixDigits(canvas){

    const digits=splitDigits(canvas,6);

    return digits
        .map(recognizeDigit)
        .join("");

}