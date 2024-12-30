"use client";

import { useEffect, useState, useRef } from 'react';
import CETEI from 'CETEIcean';

const DisplayTEI: React.FC = () => {
  const [teiHTML, setTeiHTML] = useState<string>('');

  useEffect(() => {
    const ct = new CETEI();
    let behaviors = {
      "tei": {
        "facsimile": function(e) {
          // headの中身を取得して、削除する
          e.innerHTML = "";
          
        },
        "head": function(e) {
          // headの中身を取得して、削除する
          e.innerHTML = "";

        },
        "bibl": function(e) {
          // headの中身を取得して、削除する
          e.innerHTML = "";
        },
        // lbタグのある部分にアイコンを追加し、クリックできるようにする.アイコンは必ず行の先頭に追加される
        "lb": function(e) {
          let icon = document.createElement("span");
          icon.innerHTML = "<br/>🔗";
          icon.style.cursor = "pointer";
          icon.style.marginRight = "5px";
          icon.onclick = function() {
            alert("You clicked on a line break!");
          };
          //改行している部分の先頭にアイコンを追加
          e.insertBefore(icon, e.firstChild);
      },
    }
    };
    ct.addBehaviors(behaviors);
    ct.getHTML5('data/XML/HD047654.xml').then((data: HTMLElement) => {
      console.log(data);
      const element = document.createElement('div');
      element.appendChild(data);
      setTeiHTML(element.outerHTML);
    }).catch((error: any) => {
      console.error('Error fetching XML:', error);
    });
  }, []);

  //console.log(teiHTML);

      return (
        <div className="App">
          <header className="App-header">
            <h1 style={{fontWeight: 'bold'}}>Text Viewer</h1>
            {/*divの内容を表示*/}
            <div dangerouslySetInnerHTML={{ __html: teiHTML }} />
          </header>
          <link rel="stylesheet" href="/css/CETEIcean.css" />
        </div>
      );
};

export default DisplayTEI;