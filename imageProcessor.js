const UNIT_LIST=[
"ER",
"OR",
"SICU",
"MICU",
"ICU",
"WARD"
];

async function processImage(file){

    const img=await loadImage(file);

    const canvas=document.getElementById("canvas");
    const ctx=canvas.getContext("2d");

    canvas.width=img.width;
    canvas.height=img.height;

    ctx.drawImage(img,0,0);

    const {
        data:{text}
    }=await Tesseract.recognize(canvas,"eng",{
        logger:m=>console.log(m)
    });

    const raw=text.toUpperCase();

    const unit=findUnit(raw);

    const numbers=raw.replace(/[^0-9]/g," ");

    const id5=findFive(numbers);

    const id6=findSix(numbers);

    return{
        unit,
        id5,
        id6,
        filename:`${unit}_${id5}_${id6}.jpg`
    };

}

function loadImage(file){

    return new Promise(resolve=>{

        const img=new Image();

        img.onload=()=>resolve(img);

        img.src=URL.createObjectURL(file);

    });

}

function findUnit(text){

    for(const u of UNIT_LIST){

        if(text.includes(u)) return u;

    }

    if(text.includes("EMERGENCY")) return "ER";

    return "UNKNOWN";

}

function findFive(text){

    const m=text.match(/\b\d{5}\b/);

    return m?m[0]:"-----";

}

function findSix(text){

    const m=text.match(/\b\d{6}\b/);

    return m?m[0]:"------";

}