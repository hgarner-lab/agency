// The SVG masks the supplied artwork's luminance into alpha, preserving its
// original letter shapes and antialiased edges with a transparent background.
export const MCCANN_LOGO_URL='/assets/mccann-wordmark.svg';
export const ROLE_CARD_WIDTH=800,ROLE_CARD_HEIGHT=1100;

function fitText(c,value,x,y,size,font,maxWidth=710,align='left'){
 c.textAlign=align;c.textBaseline='alphabetic';
 do{c.font=`${size}px ${font}`;if(c.measureText(value).width<=maxWidth||size<=12)break;size--;}while(true);
 c.fillText(value,x,y);
}

export function drawRoleCard(canvas,{role,profile,alias,characterIndex=0,characterImage,brandImage,year=new Date().getFullYear()}){
 if(!brandImage||!characterImage)throw Error('The card artwork is not ready.');
 canvas.width=ROLE_CARD_WIDTH;canvas.height=ROLE_CARD_HEIGHT;
 const c=canvas.getContext('2d');
 c.fillStyle=role.color;c.fillRect(0,0,800,1100);
 const logoWidth=brandImage.naturalWidth||brandImage.width,logoHeight=Math.min(brandImage.naturalHeight||brandImage.height,logoWidth/4);
 c.drawImage(brandImage,0,0,logoWidth,logoHeight,40,30,420,105);
 c.fillStyle='#172c35';fitText(c,'THE',754,66,34,'WarDisplay',230,'right');fitText(c,'AGENCY.',754,105,48,'WarDisplay',230,'right');
 fitText(c,'YOUR AGENCY ROLE',44,154,15,'WarMono',500);fitText(c,String(year),754,154,15,'WarMono',100,'right');

 const imageWidth=characterImage.naturalWidth||characterImage.width,imageHeight=characterImage.naturalHeight||characterImage.height;
 const cw=imageWidth/4,ch=imageHeight*.65,h=330,w=h*cw/ch;
 const index=Number.isInteger(characterIndex)&&characterIndex>=0&&characterIndex<4?characterIndex:0;
 c.drawImage(characterImage,index*cw,0,cw,ch,(800-w)/2,182,w,h);
 c.fillStyle='#172c35';c.fillRect(44,528,710,2);
 fitText(c,String(alias).toUpperCase(),44,573,30,'WarMono');
 fitText(c,role.name,44,662,86,'WarDisplay');
 fitText(c,role.job,44,710,24,'WarMono');
 fitText(c,Number(profile.score).toLocaleString('en-GB'),44,825,96,'WarDisplay',420);
 fitText(c,String(profile.completed),754,825,96,'WarDisplay',200,'right');
 fitText(c,'POINTS',44,862,18,'WarMono',250);
 fitText(c,'JOBS COMPLETED',754,862,18,'WarMono',330,'right');
 fitText(c,role.line,44,922,31,'WarDisplay');

 c.fillStyle='#000';c.fillRect(0,966,800,134);
 c.fillStyle=role.color;
 for(let i=0;i<34;i++){const width=[2,4,2,6,3,5,2][i%7];c.fillRect(44+i*7,991,width,29);}
 c.fillStyle='#fff';fitText(c,'THE AGENCY',754,1018,32,'WarDisplay',350,'right');
 fitText(c,'YOUR JOBS. YOUR ROLE.',44,1061,28,'WarDisplay',440);
 fitText(c,'A McCann experience',754,1061,16,'WarMono',280,'right');
 return canvas;
}
