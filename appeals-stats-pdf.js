/* Informe personal de apelaciones: PDF vectorial generado localmente.
   Solo acepta los datos privados de my_stats; no requiere servicios externos. */
(() => {
  "use strict";
  const W=595.28,H=841.89;
  const colors={
    purple:[0.15,0.09,0.26],white:[1,1,1],ink:[0.15,0.15,0.22],
    muted:[0.38,0.36,0.47],light:[0.96,0.95,0.98],
    pending:[0.86,0.64,0.29],accepted:[0.31,0.67,0.52],
    rejected:[0.88,0.43,0.52],accent:[0.51,0.39,0.76]
  };
  const cp1252={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,
    710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,
    8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,
    353:154,8250:155,339:156,382:158,376:159};
  function latin1(value){
    let result="";
    for(const ch of String(value??"")){
      const code=ch.codePointAt(0);
      if(code===10||code===13||code===9){result+=" ";continue;}
      if((code>=32&&code<=126)||(code>=160&&code<=255))
        result+=String.fromCharCode(code);
      else if(cp1252[code])result+=String.fromCharCode(cp1252[code]);
      else result+="?";
    }
    return result;
  }
  const esc=value=>latin1(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const num=n=>Number(n).toFixed(2);
  const rgb=color=>color.map(n=>Number(n).toFixed(3)).join(" ");
  const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const percent=(part,total)=>total?new Intl.NumberFormat("es-ES",{maximumFractionDigits:1})
    .format(part*100/total)+" %":"0 %";
  const dateText=value=>{
    if(!value)return "Sin registros";
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return "Sin registros";
    return new Intl.DateTimeFormat("es-ES",{
      timeZone:"UTC",day:"2-digit",month:"2-digit",year:"numeric",
      hour:"2-digit",minute:"2-digit"
    }).format(date)+" UTC";
  };
  const monthNames=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  function normalMonths(values){
    if(!Array.isArray(values))throw Error("No se pudo cargar la evolución mensual.");
    const months=values.slice(0,12).map(item=>{
      const raw=String(item?.month||"");
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw))
        throw Error("Los meses de las estadísticas no son válidos.");
      if(!Number.isSafeInteger(item.total)||item.total<0)
        throw Error("Los valores mensuales no son válidos.");
      const number=Number(raw.slice(5,7));
      return {code:raw,label:monthNames[number-1]+" "+raw.slice(2,4),value:item.total};
    });
    if(months.length!==12)throw Error("No se recibieron los 12 meses de estadísticas.");
    for(let i=1;i<months.length;i++){
      if(months[i].code<=months[i-1].code)
        throw Error("El orden de los meses no es válido.");
    }
    return months;
  }
  function build(report){
    const s=report?.stats;
    if(!s||!["total","pending","accepted","rejected"].every(key=>
      Number.isSafeInteger(s[key])&&s[key]>=0))
      throw Error("No hay estadísticas válidas para descargar.");
    if(s.pending+s.accepted+s.rejected!==s.total)
      throw Error("Los contadores de apelaciones no coinciden.");
    const months=normalMonths(report.monthly);
    const commands=[];
    const rect=(x,y,w,h,color)=>{
      commands.push(rgb(color)+" rg "+[x,y,w,h].map(num).join(" ")+" re f");
    };
    const line=(x1,y1,x2,y2,color,width=1)=>{
      commands.push(rgb(color)+" RG "+num(width)+" w "+[x1,y1,x2,y2].map(num).join(" ")+" m "+
        num(x2)+" "+num(y2)+" l S");
    };
    const text=(value,x,y,size=10,bold=false,color=colors.ink)=>{
      commands.push("BT /"+(bold?"F2":"F1")+" "+num(size)+" Tf "+rgb(color)+" rg "+
        num(x)+" "+num(y)+" Td ("+esc(value)+") Tj ET");
    };
    // Cabecera
    rect(0,735,W,106,colors.purple);
    rect(0,731,W,4,colors.accent);
    text("SHADOWS BYTE GAMING OFFICIAL V2",40,801,15,true,colors.white);
    text("Informe personal de estadísticas de apelaciones",40,774,12,false,colors.white);
    text("Generado: "+dateText(report.generated_at||new Date().toISOString()),40,751,9,false,colors.white);
    // Recuadros con cifras: totales del historial completo, no solo de la primera página.
    text("Resumen de resultados",42,706,13,true);
    const cards=[
      ["TOTAL",s.total,colors.accent],
      ["PENDIENTES",s.pending,colors.pending],
      ["ACEPTADAS",s.accepted,colors.accepted],
      ["RECHAZADAS",s.rejected,colors.rejected]
    ];
    cards.forEach(([label,value,color],i)=>{
      const x=42+i*131;
      rect(x,632,121,65,colors.light);
      rect(x,632,121,4,color);
      text(label,x+10,671,9,true,colors.muted);
      text(String(value),x+10,648,20,true,colors.ink);
    });
    text("Última solicitud: "+dateText(report.last_submitted_at),42,606,9,false,colors.ink);
    text("Última resolución: "+dateText(report.last_reviewed_at),42,591,9,false,colors.ink);
    // Primer gráfico: proporciones de todos los expedientes.
    text("Distribución por estado",42,557,13,true);
    text("Porcentaje del total histórico de apelaciones",42,538,9,false,colors.muted);
    rect(42,506,511,21,[0.89,0.87,0.93]);
    const parts=[
      ["Pendientes",s.pending,colors.pending],
      ["Aceptadas",s.accepted,colors.accepted],
      ["Rechazadas",s.rejected,colors.rejected]
    ];
    let cursor=42;
    parts.forEach(([label,value,color])=>{
      const width=s.total?511*value/s.total:0;
      if(width>0)rect(cursor,506,width,21,color);
      cursor+=width;
    });
    if(!s.total)text("Sin datos todavía",241,512,8,false,colors.muted);
    parts.forEach(([label,value,color],i)=>{
      const x=42+i*176;
      rect(x,481,9,9,color);
      text(label+": "+value+" ("+percent(value,s.total)+")",x+15,482,8,false,colors.ink);
    });
    // Segundo gráfico: doce meses de solicitudes, con altura proporcional al máximo.
    text("Evolución mensual de solicitudes",42,445,13,true);
    text("Apelaciones presentadas por mes (UTC)",42,427,9,false,colors.muted);
    const baseline=258,barMax=117,max=Math.max(1,...months.map(item=>item.value));
    line(42,baseline,553,baseline,[0.70,0.68,0.75],0.7);
    months.forEach((month,i)=>{
      const x=43+i*42.4;
      const height=month.value?month.value/max*barMax:0;
      if(height)rect(x+11,baseline,21,height,colors.accent);
      text(String(month.value),x+16,baseline+height+8,8,true,colors.ink);
      text(month.label,x+4,239,7.4,false,colors.muted);
    });
    const period=months[0].code+" a "+months[11].code;
    text("Periodo del gráfico: "+period+" (12 meses, UTC)",42,211,9,false,colors.muted);
    // Lectura resumida, separada de los datos del período mensual.
    rect(42,108,511,88,colors.light);
    text("Interpretación del historial",54,179,11,true,colors.purple);
    if(s.total===0){
      text("No se han registrado apelaciones. Aún no hay porcentajes representativos.",54,157,9);
    }else{
      text("Aceptadas: "+percent(s.accepted,s.total)+"   |   Rechazadas: "+
        percent(s.rejected,s.total)+"   |   Pendientes: "+percent(s.pending,s.total),54,157,9);
    }
    const periodTotal=months.reduce((sum,month)=>sum+month.value,0);
    text("Solicitudes presentadas en el período: "+periodTotal+".",54,137,9);
    text("Los porcentajes corresponden al historial total; los meses, a las solicitudes recientes.",54,117,8,false,colors.muted);
    // Pie de página
    line(42,73,553,73,[0.77,0.74,0.82],0.7);
    text("Documento privado de tu cuenta. No compartir si contiene información sensible.",42,56,8,false,colors.muted);
    text("Shadows Byte Gaming Official V2  |  Página 1 de 1",42,39,8,false,colors.muted);
    const stream=commands.join("\n")+"\n";
    const objects=[null,
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Count 1 /Kids [5 0 R] >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+num(W)+" "+num(H)+
        "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>",
      "<< /Length "+stream.length+" >>\nstream\n"+stream+"endstream"
    ];
    let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets=[0];
    for(let i=1;i<objects.length;i++){
      offsets[i]=pdf.length;
      pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n";
    }
    const xrefStart=pdf.length;
    pdf+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
    for(let i=1;i<objects.length;i++)
      pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
    pdf+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+
      xrefStart+"\n%%EOF\n";
    const bytes=new Uint8Array(pdf.length);
    for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
    return bytes;
  }
  function download(report){
    const bytes=build(report);
    const blob=new Blob([bytes],{type:"application/pdf"});
    const href=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=href;
    const today=new Date(report.generated_at||Date.now()).toISOString().slice(0,10);
    anchor.download="SBV2-estadisticas-apelaciones-"+today+".pdf";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(href),30000);
    return bytes.length;
  }
  window.SBAppealStatsPDF={build,download};
})();
