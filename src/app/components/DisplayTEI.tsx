'use client';

import { useEffect, useState } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';

const DisplayTEI: React.FC = () => {
  const [teiHTML, setTeiHTML] = useState<string>('');

  useEffect(() => {
    const ct = new CETEI();
    const behaviors = {
      tei: {
        facsimile: function (e: HTMLElement) {
          // headの中身を取得して、削除する
          e.innerHTML = '';
        },
        head: function (e: HTMLElement) {
          // headの中身を取得して、削除する
          e.innerHTML = '';
        },
        bibl: function (e: HTMLElement) {
          // headの中身を取得して、削除する
          e.innerHTML = '';
        },
        // lbタグのある部分にアイコンを追加し、クリックできるようにする.アイコンは必ず行の先頭に追加される
        lb: function (e: HTMLElement) {
          const icon = document.createElement('span');
          icon.innerHTML = '<br/>🔗';
          icon.style.cursor = 'pointer';
          icon.style.marginRight = '5px';
          icon.onclick = function () {
            alert('You clicked on a line break!');
          };
          //改行している部分の先頭にアイコンを追加
          e.insertBefore(icon, e.firstChild);
        },
      },
    };
    ct.addBehaviors(behaviors);
    ct.getHTML5('data/XML/HD047654.xml')
      .then((data: HTMLElement) => {
        const element = document.createElement('div');
        element.appendChild(data);
        setTeiHTML(element.outerHTML);
      })
      .catch((error: unknown) => {
        console.error('Error fetching XML:', error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{ fontWeight: 'bold' }}>Text Viewer</h1>
        {/*divの内容を表示*/}
        <div dangerouslySetInnerHTML={{ __html: teiHTML }} />
      </header>
    </div>
  );
};

export default DisplayTEI;
