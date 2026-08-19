const UNITS=[
"ER",
"OR",
"SICU",
"MICU",
"ICU",
"NICU",
"PICU"
];

async function processImage(file){

    const img=await loadImage(file);

    const canvas=document.getElementById("canvas");
    const ctx=canvas.getContext("2d");

    canvas.width=img.width;
    canvas.height=img.height;

    ctx.drawImage(img,0,0);

    const result=await Tesseract.recognize(
        canvas,
        "eng",
        {
            logger:m=>console.log(m)
        }
    );

    const text=result.data.text.toUpperCase();

    const unit=findUnit(text);

    const id6=find6(text);

    const id5=find5(text);

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

    for(const u of UNITS){
        if(text.includes(u)) return u;
    }

    if(text.includes("EMERGENCY")) return "ER";

    return "UNKNOWN";

}

function find5(text){

    const all=text.match(/\d{5}/g);

    return all?all[0]:"-----";

}

function find6(text){

    const all=text.match(/\d{6}/g);

    return all?all[0]:"------";

}