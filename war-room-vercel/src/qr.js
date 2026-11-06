// QR Model 2, version 5-L, byte mode. Fixed size keeps join codes crisp on projectors.
export function qr(text) {
 const bytes=[...new TextEncoder().encode(text)];if(bytes.length>106)return '<p>Use the room link below.</p>';
 const bits=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};put(4,4);put(bytes.length,8);bytes.forEach(b=>put(b,8));put(0,Math.min(4,864-bits.length));while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>(a<<1)|b,0));for(let i=0;data.length<108;i++)data.push(i%2?17:236);
 const exp=new Array(512),log=new Array(256);let x=1;for(let i=0;i<255;i++){exp[i]=x;log[x]=i;x<<=1;if(x&256)x^=285;}for(let i=255;i<512;i++)exp[i]=exp[i-255];const mul=(a,b)=>a&&b?exp[log[a]+log[b]]:0;
 let poly=[1];for(let i=0;i<26;i++){const next=new Array(poly.length+1).fill(0);poly.forEach((v,j)=>{next[j]^=v;next[j+1]^=mul(v,exp[i])});poly=next;}
 const ecc=new Array(26).fill(0);for(const b of data){const f=b^ecc.shift();ecc.push(0);for(let i=0;i<26;i++)ecc[i]^=mul(poly[i+1],f);}
 const stream=[];for(const b of [...data,...ecc])for(let i=7;i>=0;i--)stream.push((b>>>i)&1);
 const n=37,m=Array.from({length:n},()=>new Array(n).fill(null));const set=(r,c,v)=>{if(r>=0&&r<n&&c>=0&&c<n)m[r][c]=v?1:0};
 for(const [r,c] of [[0,0],[0,30],[30,0]])for(let y=-1;y<=7;y++)for(let z=-1;z<=7;z++)set(r+y,c+z,y>=0&&y<=6&&z>=0&&z<=6&&(y===0||y===6||z===0||z===6||(y>=2&&y<=4&&z>=2&&z<=4)));
 for(let i=8;i<n-8;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
 for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++)set(30+y,30+z,Math.max(Math.abs(y),Math.abs(z))!==1);
 // Format information: error correction L, mask 0, BCH(15,5).
 let f=8<<10;for(let i=14;i>=10;i--)if((f>>>i)&1)f^=0x537<<(i-10);f=((8<<10)|f)^0x5412;
 for(let i=0;i<15;i++){const b=(f>>>i)&1;if(i<6)set(i,8,b);else if(i<8)set(i+1,8,b);else set(n-15+i,8,b);if(i<8)set(8,n-i-1,b);else if(i<9)set(8,15-i,b);else set(8,15-i-1,b);}set(n-8,8,1);
 let index=0,up=true;for(let col=n-1;col>0;col-=2){if(col===6)col--;for(let i=0;i<n;i++){const row=up?n-1-i:i;for(let k=0;k<2;k++){const c=col-k;if(m[row][c]===null){let b=stream[index++]||0;if((row+c)%2===0)b^=1;m[row][c]=b;}}}up=!up;}
 let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])d+=`M${c+4} ${r+4}h1v1h-1z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" role="img" aria-label="Scan to join this War Room"><rect width="45" height="45" fill="white"/><path d="${d}" fill="#10110e" shape-rendering="crispEdges"/></svg>`;
}
