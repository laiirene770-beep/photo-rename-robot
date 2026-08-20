/* ==========================================
   Photo Rename Robot V5.0
   validator.js
========================================== */

/* 已知單位，可自行增加 */
const UNIT_LIST = [
  "ER",
  "OR",
  "ICU",
  "SICU",
  "NICU",
  "PICU",
  "RCC",
  "OPD",
  "WARD"
];

/* -------------------------
   英文修正
-------------------------- */

function normalizeLetters(text){

  return text
    .toUpperCase()
    .replace(/0/g,"O")
    .replace(/1/g,"I")
    .replace(/5/g,"S")
    .replace(/8/g,"B");

}

/* -------------------------
   單位驗證
-------------------------- */

function validateUnit(raw){

  if(!raw) return "未知單位";

  let text = raw
    .replace(/\s/g,"")
    .replace(/[^\u4E00-\u9FFFA-Za-z0-9]/g,"");

  text = text.replace(/^輔太/,"輔大");
  text = text.replace(/^辅大/,"輔大");

  const eng = normalizeLetters(
      text.replace("輔大","")
  );

  let best = "";
  let score = 999;

  for(const unit of UNIT_LIST){

      const d = levenshtein(eng,unit);

      if(d < score){

          score = d;
          best = unit;

      }

  }

  if(score <= 2){
      return "輔大" + best;
  }

  return "未知單位";

}

/* -------------------------
   定位器 5碼
-------------------------- */

function validateLocator(text){

    text = normalizeDigits(text);

    text = text.replace(/\D/g,"");

    const m = text.match(/\d{5}/);

    return m ? m[0] : "00000";

}
/* -------------------------
   財產編號 6碼
-------------------------- */

function validateAsset(raw){

  let text = normalizeDigits(raw);

  text = text.replace(/\D/g,"");

  if(text.length > 6){
      text = text.substring(0,6);
  }

  while(text.length < 6){
      text = "0" + text;
  }

  return text;

}

/* -------------------------
   數字容錯
-------------------------- */

function normalizeDigits(text){

  if(!text) return "";

  return text
    .toUpperCase()

    .replace(/[OQD]/g,"0")
    .replace(/[IL｜]/g,"1")
    .replace(/S/g,"5")
    .replace(/B/g,"8")
    .replace(/G/g,"6")
    .replace(/Z/g,"2")
    .replace(/T/g,"7");

}

/* -------------------------
   Levenshtein
-------------------------- */

function levenshtein(a,b){

  const matrix=[];

  for(let i=0;i<=b.length;i++){
      matrix[i]=[i];
  }

  for(let j=0;j<=a.length;j++){
      matrix[0][j]=j;
  }

  for(let i=1;i<=b.length;i++){

      for(let j=1;j<=a.length;j++){

          if(b.charAt(i-1)==a.charAt(j-1)){

              matrix[i][j]=matrix[i-1][j-1];

          }else{

              matrix[i][j]=Math.min(
                  matrix[i-1][j-1]+1,
                  matrix[i][j-1]+1,
                  matrix[i-1][j]+1
              );

          }

      }

  }

  return matrix[b.length][a.length];

}
