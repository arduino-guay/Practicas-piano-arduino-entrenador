var hayMidi = false;
var midiOut = [];
var chkDer, chkIzq;
var timer;
var metronomo = "dddd 76 77 77 77 60 50 50 50";
var trasponerSeminTonos;

function connect() {
    navigator.requestMIDIAccess()
        .then(
            (midi) => midiReady(midi),
            (err) => console.log('Something went wrong', err));
}

function midiReady(midi) {
    // Also react to device changes.
    midi.addEventListener('statechange', (event) => initDevices(event.target));
    initDevices(midi); // see the next section!
}

function initDevices(midi) {
    // MIDI devices that you send data to.
    const outputs = midi.outputs.values();
    for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
        midiOut.push(output.value);
    }
    hayMidi = midiOut.length;
}

function enviar(nota, on, instrumento) {
    if (!hayMidi) {
        return;
    }
    let cmd = '' + (on ? 1 : 0) + nota;
    if (on == 1) {
        midiOut[0].send([0x90 + instrumento, nota, 127]);
        if (midiOut[1]) {
            midiOut[1].send([0x90 + instrumento, nota, 20]);
        }
    } else {
        midiOut[0].send([0x90 + instrumento, nota, 0]);
        if (midiOut[1]) {
            midiOut[1].send([0x90 + instrumento, nota, 0]);
        }
    }
}

class TimerNotas {
    PRIMERA_NOTA = 24;
    msBPM = 0;

    apagarNota(nota) {
        //console.log('(' + (Date.now()-t0) + ') Nota off: ' + nota);
        enviar(nota.pitch, 0, nota.instrument);
        var tecla = document.querySelector("#n" + nota.pitch);
        if (tecla) {
            tecla.classList.remove(nota.instrument == 1 ? "izqda" : "drcha");
        }
    }

    encederNota(notas) { // tmpNegras = 1 para negra
        //console.log('Nota on: ' + nota);
        notas.forEach(nota => {
            enviar(nota.pitch, 1, nota.instrument);
            var tecla = document.querySelector("#n" + nota.pitch);
            if (tecla) {
                tecla.classList.add(nota.instrument == 1 ? "izqda" : "drcha");
            }
            setTimeout(this.apagarNota, nota.duration * this.msBPM, nota);
        });
        // TODO Enceder nota
    }

    setMsMedida(ms) {
        this.msBPM = ms;
    }

    setTic(bpm) {
        this.msBPM = 60000 / bpm;
        console.log('BPM = ' + this.msBPM + ' ms');
    }

}

function CursorControl() {
    t0 = Date.now();
    var self = this;
    timer = new TimerNotas();
    self.beatSubdivisions = 1;


    self.onStart = function () {
        var svg = document.querySelector("#paper svg");
        var cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
        cursor.setAttribute("class", "abcjs-cursor");
        cursor.setAttributeNS(null, 'x1', 0);
        cursor.setAttributeNS(null, 'y1', 0);
        cursor.setAttributeNS(null, 'x2', 0);
        cursor.setAttributeNS(null, 'y2', 0);
        svg.appendChild(cursor);
        t0 = Date.now();
    };

    self.onBeat = function (beatNumber, totalBeats, totalTime) {
        //console.log('(' + (Date.now() - t0) + ') : ' + beatNumber );
        t0 = Date.now();
        if (!self.beatDiv)
            self.beatDiv = document.querySelector(".beat");
        self.beatDiv.innerText = "Beat: " + beatNumber + " Total: " + totalBeats + " Total time: " + totalTime;
        //ABCJS.synth.playEvent([{"cmd":"note","pitch":76+beatNumber%4,"volume":105,"start":0,"duration":0.125,"instrument":10,"gap":0}]);
    };

    self.onEvent = function (ev) {
        //console.log(ev);
        if (ev.midiPitches && ev.midiPitches[0]) {
            timer.encederNota(ev.midiPitches);
        }
        if (ev.measureStart && ev.left === null)
            return; // this was the second part of a tie across a measure line. Just ignore it.

        var lastSelection = document.querySelectorAll("#paper svg .highlight");
        for (var k = 0; k < lastSelection.length; k++)
            lastSelection[k].classList.remove("highlight");
        //var el = document.querySelector(".feedback").innerHTML = "<div class='label'>Current Note:</div>" + JSON.stringify(ev, null, 4);
        for (var i = 0; i < ev.elements.length; i++) {
            var note = ev.elements[i];
            for (var j = 0; j < note.length; j++) {
                note[j].classList.add("highlight");
            }
        }

        var cursor = document.querySelector("#paper svg .abcjs-cursor");
        if (cursor) {
            cursor.setAttribute("x1", ev.left - 2);
            cursor.setAttribute("x2", ev.left - 2);
            cursor.setAttribute("y1", ev.top);
            cursor.setAttribute("y2", ev.top + ev.height);
            //document.querySelector("#paper").scrollTo(0, ev.top - 100);
        }
    };

    self.onFinished = function () {
        var els = document.querySelectorAll("svg .abcjs-note_selected");
        for (var i = 0; i < els.length; i++) {
            els[i].classList.remove("abcjs-note_selected");
        }
        var cursor = document.querySelector("#paper svg .abcjs-cursor");
        if (cursor) {
            cursor.setAttribute("x1", 0);
            cursor.setAttribute("x2", 0);
            cursor.setAttribute("y1", 0);
            cursor.setAttribute("y2", 0);
        }
    };

    self.encederNota = function (notas) {
        timer.encederNota(notas);
    };
}

var cursorControl = new CursorControl();

var abc = [];
var tuneNames = ["Cooleys", "Bill Bailey", "All Notes On Piano"];
var canciones;
var currentTune = 0;
var cancion;

var synthControl;

function clickListener(abcElem, tuneNumber, classes, analysis, drag, mouseEvent) {
    var lastClicked = abcElem.midiPitches;
    if (!lastClicked)
        return;

    if (synthControl) {
        if (!synthControl.isLoaded)
            synthControl.play().then(function () {
                synthControl.seek(
                    abcElem.currentTrackMilliseconds /
                    (synthControl.midiBuffer.duration * 1000)
                );
            });
        else
            synthControl.seek(
                abcElem.currentTrackMilliseconds /
                (synthControl.midiBuffer.duration * 1000)
            );
    }
    ABCJS.synth.playEvent(lastClicked, abcElem.midiGraceNotePitches, synthControl.visualObj.millisecondsPerMeasure()).then(function (response) {
        console.log("note played");
    }).catch(function (error) {
        console.log("error playing note", error);
    });
}

var abcOptions = {
    add_classes: true,
    clickListener: self.clickListener,
    responsive: "resize",
    viewportVertical: true,
    staffwidth: 900,
    scale: 2,
    visualTranspose: trasponerSeminTonos
};

function load() {
    //document.getElementById("start").addEventListener("click", start);
    chkDer = document.getElementById("chkDerecha");
    chkIzq = document.getElementById("chkIzquierda");

    if (ABCJS.synth.supportsAudio()) {
        synthControl = new ABCJS.synth.SynthController();
        synthControl.load("#audio", cursorControl, { displayLoop: true, displayRestart: true, displayPlay: true, displayProgress: true, displayWarp: true });
    } else {
        document.querySelector("#audio").innerHTML = "<div class='audio-error'>Audio is not supported in this browser.</div>";
    }
    cargaTitulos();
    generaTeclado(document.getElementById("keyboard"));
    connect();
}

function download() {
    if (synthControl)
        synthControl.download(tuneNames[currentTune] + ".wav");
}

function start() {
    if (synthControl)
        synthControl.play();
}

function compases(txt, num) {
    let tmp = txt.replace(/\n/g, '').replace(/\r/g, '').split('|');
    let res = '';
    let i = 0, j = 0;
    do {
        res += tmp[i] + '|';
        j++; i++;
        if (j == num) {
            j = 0;
            res += '\n';
        }
    } while (i < tmp.length);
    return res;
}

function setTune(userAction, abcText) {
    if (!abcText) {
        return;
    }
    let tmp = abcText.split('%-');
    if (tmp.length > 1) {
        abcText = tmp[0] + compases(tmp[1], 8) + tmp[2] + compases(tmp[3], 8);
    }
    let partes = abcText.split('V:');
    cancion = partes[0];
    if (chkDer.checked) {
        cancion += 'V:' + partes[1];
    }
    if (chkIzq.checked && (partes.length > 2)) {
        cancion += 'V:' + partes[2];
    }

    //synthControl.disable(true);
    abcOptions.visualTranspose = trasponerSeminTonos;
    var visualObj = ABCJS.renderAbc("paper", cancion, abcOptions)[0];
    timer.setMsMedida(visualObj.millisecondsPerMeasure());
    // TODO-PER: This will allow the callback function to have access to timing info - this should be incorporated into the render at some point.
    var midiBuffer = new ABCJS.synth.CreateSynth();
    midiBuffer.init({
        //audioContext: new AudioContext(),
        visualObj: visualObj,
        // sequence: [],
        // millisecondsPerMeasure: 1000,
        // debugCallback: function(message) { console.log(message) },
        options: {
            // soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/" ,
            // sequenceCallback: function(noteMapTracks, callbackContext) { return noteMapTracks; },
            // callbackContext: this,
            // onEnded: function(callbackContext),
            // pan: [ -0.5, 0.5 ]
        }
    }).then(function (response) {
        console.log(response);
        if (synthControl) {
            let options = {
                //program: 14,
                drum: metronomo,
                midiTranspose: trasponerSeminTonos
                //drum : "dd 76 77 60 30" 
            };
            synthControl.setTune(visualObj, userAction, options).then(function (response) {
                console.log("Audio successfully loaded.")
            }).catch(function (error) {
                console.warn("Audio problem:", error);
            });
        }
    }).catch(function (error) {
        console.warn("Audio problem:", error);
    });
}

function cargaCombo() {
    var ele = document.getElementById('canciones');
    canciones.forEach(function (b) {
        ele.innerHTML += '<option value="' + b.file + '">' + b.titulo + '</option>';
    })
}

function cambiaCancion() {
    var met = document.getElementById('metronomo');
    metronomo = met.value;
    var ele = document.getElementById('canciones');
    trasponerSeminTonos = document.getElementById("trasponer").value;
    cargaPractica(ele.value);
}

function cargaTitulos() {
    fetch('practicas/practicas.json')
        .then(response => response.json())
        .then(jsonResponse => {
            canciones = jsonResponse.Practicas;
            cargaCombo();
            cargaPractica(canciones[0].file);
        });
}

function cargaPractica(file) {
    fetch('practicas/' + file)
        .then(response => response.text())
        .then(text => setTune(true, text));
}

function siguiente() {
    currentTune++;
    if (currentTune > 3)
        currentTune = 1;
    cargaPractica(currentTune);
}

function anterior() {
    if (currentTune > 1)
        currentTune--;
    cargaPractica(currentTune);
}
