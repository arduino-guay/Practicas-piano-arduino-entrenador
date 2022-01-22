const octavas = 5;
const primOctava = 2;
const primNota = 36;

const teclas = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function generaTeclado(elemento) {
    let html = '';
    let nota = primNota;
    let posX = 0;
    for (let octava = primOctava; octava < primOctava + octavas; octava++) {
        for (let tecla = 0; tecla < 12; tecla++) {
            let negra = teclas[tecla].endsWith('#');

            html += '<div class="key ' + (negra ? '' : 'n'+teclas[tecla]) +
                (negra ? ' negra' : ' blanca') + '" id="n' + nota + '" style="left: ' + posX + 'px;">';
            html += '<div class="label">' + teclas[tecla] + '</div></div>';
            nota++;
            if (negra) {
                posX += 15;
            } else if (teclas[tecla] == 'E' || teclas[tecla] == 'B') {
                posX += 35;
            } else {
                posX += 20;
            }
        }
    }
    elemento.innerHTML = html;
}