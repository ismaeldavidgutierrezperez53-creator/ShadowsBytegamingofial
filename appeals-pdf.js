/* Offline, dependency-free PDF export for staff-only appeal case files.
   The file is assembled locally in the browser after an authenticated export. */
(() => {
  "use strict";
  const A4_W=595.28, A4_H=841.89, LEFT=45, RIGHT=45, BOTTOM=55, TOP=57;
  const map={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,
    710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,
    8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,
    353:154,8250:155,339:156,382:158,376:159};
  const toBytes=s=>{
    let out="";
    for(const ch of String(s??"")){
      const c=ch.codePointAt(0);
      if(c===9){out+="    ";continue;}
      if(c===10||c===13){out+=" ";continue;}
      if((c>=32&&c<=126)||(c>=160&&c<=255))out+=String.fromCharCode(c);
      else if(map[c])out+=String.fromCharCode(map[c]);
      else out+="?";
    }
    return out;
  };
  const escape=s=>toBytes(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const fmt=value=>value?new Date(value).toLocaleString("es-ES",{
    dateStyle:"medium",timeStyle:"short"}):"No consta";
  const statuses={pending:"Pendiente",accepted:"Aceptada",rejected:"Rechazada"};
  const sanctions={warning:"Advertencia",suspend:"Suspension temporal",ban:"Expulsion"};
  const wrap=(value,max)=>{
    const paragraphs=String(value??"").replace(/\r/g,"").split("\n");
    const lines=[];
    for(const p of paragraphs){
      if(!p.trim()){lines.push("");continue;}
      const words=p.trim().split(/\s+/);
      let line="";
      for(const word of words){
        if(!line){line=word;continue;}
        if((line+" "+word).length<=max)line+=" "+word;
        else{lines.push(line);line=word;}
      }
      while(line.length>max){lines.push(line.slice(0,max));line=line.slice(max);}
      lines.push(line);
    }
    return lines;
  };
  function build(report){
    if(!report||!report.appeal)throw Error("El expediente no está disponible.");
    const a=report.appeal, sanction=report.sanction||{};
    const people=new Map((report.profiles||[]).map(p=>[p.id,p.display_name||p.username]));
    const who=id=>id?(people.get(id)||"Miembro")+" ["+id+"]":"Sin asignar";
    let pages=[[]],page=pages[0],y=A4_H-TOP;
    const nextPage=()=>{page=[];pages.push(page);y=A4_H-TOP;};
    const text=(value,{size=10,bold=false,indent=0,space=2}={})=>{
      const max=Math.max(36,Math.floor((A4_W-LEFT-RIGHT-indent)/(size*.58)));
      for(const line of wrap(value,max)){
        const step=size*1.45;
        if(y-step<BOTTOM)nextPage();
        if(line){
          page.push("BT /"+(bold?"F2":"F1")+" "+size.toFixed(1)+" Tf "+(bold?".21 .10 .39":".13 .12 .20")+
            " rg "+(LEFT+indent).toFixed(2)+" "+y.toFixed(2)+" Td ("+escape(line)+") Tj ET");
        }
        y-=step;
      }
      y-=space;
    };
    const section=name=>{y-=8;text(name,{size:12,bold:true,space:8});};
    text("SHADOWS BYTE GAMING OFFICIAL",{size:15,bold:true,space:6});
    text("Informe confidencial de apelacion",{size:13,bold:true,space:12});
    text("Generado: "+fmt(report.generated_at),{size:9});
    text("Expediente: "+a.id,{size:9});
    section("Resumen del expediente");
    text("Estado: "+(statuses[a.status]||a.status));
    text("Miembro: "+who(a.member_id));
    text("Presentada: "+fmt(a.created_at));
    text("Responsable asignado: "+who(a.assigned_to));
    if(a.assigned_at)text("Asignado: "+fmt(a.assigned_at));
    section("Sancion inicial");
    text("Tipo: "+(sanctions[sanction.action]||sanction.action||"No consta"));
    text("Impuesta: "+fmt(sanction.created_at));
    text("Registrada por: "+who(sanction.actor_id));
    text("Motivo: "+(sanction.reason||"No consta"));
    section("Solicitud del miembro");
    text(a.reason||"No consta");
    section("Decision de moderacion");
    if(a.status==="pending")text("Sin resolver.");
    else{
      text("Resultado: "+(statuses[a.status]||a.status));
      text("Fecha: "+fmt(a.reviewed_at));
      text("Revisada por: "+who(a.reviewer_id));
      text("Justificacion: "+(a.review_note||"No consta"));
    }
    section("Historial de asignaciones");
    const history=report.assignment_history||[];
    if(!history.length)text("No hay cambios de responsable registrados.");
    for(const h of history){
      text(fmt(h.created_at)+" - Modificado por: "+who(h.changed_by),{bold:true});
      text("Antes: "+who(h.previous_assignee)+" | Despues: "+who(h.new_assignee),{indent:10});
      y-=3;
    }
    section("Conversacion completa ("+(report.messages||[]).length+" mensajes)");
    const messages=report.messages||[];
    if(!messages.length)text("No hay mensajes en este expediente.");
    for(const m of messages){
      text(fmt(m.created_at)+" - "+(m.sender_role==="staff"?"Moderacion":"Miembro")+
        " - "+who(m.sender_id),{bold:true,size:9,space:3});
      text(m.body||"",{indent:10,space:10});
    }
    y-=6;
    text("Este archivo contiene informacion privada de moderacion. Custodiarlo de forma segura.",
      {size:9,space:5});
    return assemble(pages);
  }
  function assemble(pages){
    const objects=[null,
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Count "+pages.length+" /Kids ["+
        pages.map((_,i)=>(5+2*i)+" 0 R").join(" ")+"] >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    ];
    pages.forEach((items,i)=>{
      const pageObj=5+i*2,streamObj=pageObj+1;
      const footer="BT /F1 8 Tf .39 .35 .46 rg 45 32 Td ("+
        escape("Shadows Byte | Expediente privado | Pagina "+(i+1)+" de "+pages.length)+
        ") Tj ET";
      const stream=items.join("\n")+"\n"+footer;
      objects[pageObj]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+
        A4_W+" "+A4_H+"] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "+
        "/Contents "+streamObj+" 0 R >>";
      objects[streamObj]="<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream";
    });
    let out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets=[0];
    for(let i=1;i<objects.length;i++){
      offsets[i]=out.length;
      out+=i+" 0 obj\n"+objects[i]+"\nendobj\n";
    }
    const xrefStart=out.length;
    out+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
    for(let i=1;i<objects.length;i++)
      out+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
    out+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+
      xrefStart+"\n%%EOF\n";
    const bytes=new Uint8Array(out.length);
    for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;
    return bytes;
  }
  function download(report){
    const bytes=build(report);
    const blob=new Blob([bytes],{type:"application/pdf"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="SBV2-apelacion-"+String(report.appeal.id).slice(0,8)+".pdf";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    return bytes.length;
  }
  window.SBAppealsPDF={download,build};
})();