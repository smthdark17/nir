// Получение элементов DOM
var table = document.querySelector('#table');
var inputElements = document.querySelectorAll('input[tooltip]');
var tabLinks = document.querySelectorAll('.tab-controls a');
var tableAddBtn = document.querySelector('.table-add');
var searchInput = document.getElementById('searchConstant');

// Добавление обработчика события для каждого input с атрибутом tooltip
inputElements.forEach(function(inputElement) {
    inputElement.addEventListener('focus', function() {
        this.setAttribute('title', this.getAttribute('tooltip'));
    });
});

// Добавление обработчика события для переключения вкладок
tabLinks.forEach(function(tabLink) {
    tabLink.addEventListener('click', function(e) {
        e.preventDefault();
        var tabId = this.getAttribute('data-tab');
        var activeTab = document.querySelector('.tab.active');
        activeTab.classList.remove('active');
        activeTab.style.display = 'none';

        var newActiveTab = document.getElementById(tabId);
        newActiveTab.classList.add('active');
        newActiveTab.style.display = 'block';

        

        document.querySelectorAll('.tab-controls a').forEach(function(link) {
            link.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Скрытие всех вкладок, кроме активной
document.querySelectorAll('.tab:not(.active)').forEach(function(tab) {
    tab.style.display = 'none';
});

const templateRow = document.querySelector('#coordinates-table .hide').cloneNode(true);

// Добавление обработчика события для кнопки "Добавить" в таблице
tableAddBtn.addEventListener('click', function() {
    try {
        var formula = chemicalFormula(document.querySelector('#syslabel').value);
    } catch (error) {
        console.error(error);
        return;
    }

    var tbody = table.querySelector('tbody');
    tbody.querySelectorAll('.XYZ').forEach(function(row) {
        row.remove();
    });

    for (var element in formula) {
        for (var i = 0; i < formula[element]; i++) {
            var clone = templateRow.cloneNode(true); // Используем сохраненную шаблонную строку
            clone.classList.remove('hide', 'table-line');
            clone.classList.add('XYZ');
            clone.querySelector('.atomName').textContent = element;
            tbody.appendChild(clone);
        }
        console.log(element + ': ' + formula[element]);
    }

    var tdSelector = '.table-editable table tr.XYZ td:not(.atomName)';
    tbody.querySelectorAll(tdSelector).forEach(function(td) {
        td.addEventListener('keydown', function(e) {
            var caretPos = getCaretCharacterOffsetWithin(td);
            console.log(e.keyCode);
            switch (e.keyCode) {
                case 37: // left
                    if (caretPos == 0)
                        tdSelector[tdSelector.indexOf(td) - 1].focus();
                    break;
                case 38: // up
                    tdSelector[tdSelector.indexOf(td) - 3].focus();
                    break;
                case 39: // right
                    if (caretPos == td.textContent.length)
                        tdSelector[tdSelector.indexOf(td) + 1].focus();
                    break;
                case 13: // enter
                case 40: // down
                    e.preventDefault();
                    tdSelector[tdSelector.indexOf(td) + 3].focus();
                    break;
            }
        });
    });
});

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ((sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

// Остальной код остается без изменений

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ((sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}


function formToFDF(event) {
    event.preventDefault();
    var formJSON = [
        {
            name: "SystemName",
            value: $("#sysname").val()
        },
        {
            name: "SystemLabel",
            value: $("#syslabel").val()
        },
        {
            name: "AtomicCoordinatesFormat",
            value: $( "#acf option:selected" ).text()
        },
    ]
    var formula = chemicalFormula($("#syslabel").val());
    formJSON = insert(formJSON, 2, {
        "name": "NumberOfAtoms",
        "value": getNumberOfAtoms(formula)
    });
    formJSON = insert(formJSON, 3, {
        "name": "NumberOfSpecies",
        "value": getNumberOfSpecies(formula)
    });

    var species = new Object();
    species.name = "species";
    species.value = [];
    var i = 1;
    for (var k in formula) {
        species.value.push({
            "name": k,
            "value": [i, getAtomicNumber(k)]
        });
        i++;
    }
    formJSON.push(species);
    var atoms = new Object();
    atoms.name = "atoms"
    atoms.value = [];
    $("form").find('tr.XYZ').each(function () {
        var obj = new Object();
        obj.value = [];
        $(this).find('td').each(function (index) {
            var text = $(this).text().trim();
            if (index == "3")
                obj.name = species.value.find(el => el.name === text).value[0]
            else
                obj.value.push(text)
        })
        atoms.value.push(obj);
    });
    formJSON.push(atoms);
    $(".constant-value").each(function() {
        switch($(this)[0].type){
            case "checkbox":
                formJSON.push({
                    "name": $(this)[0].name,
                    "value": $(this)[0].checked
                });
                break;
            case "text":
                formJSON.push({
                    "name": $(this)[0].name,
                    "value": $(this)[0].value
                })
                break;
            case "textarea":
                var formattedText  = $(this)[0].value.trim().replace(/^/gm, '# ')
                formJSON.push({
                    "name": $(this)[0].name,
                    "value": formattedText
                })
                break;
        }
    });
       
    console.log(formJSON);
    return formJSON;
}

const insert = (arr, index, newItem) => [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted item
    newItem,
    // part of the array after the specified index
    ...arr.slice(index)
]

function getNumberOfAtoms(input) {
    var res = 0;
    for (var k in input) {
        res += input[k];
    }
    return res;
}

function getNumberOfSpecies(input) {
    return Object.keys(input).length;
}

var availableTags = [
    "MeshCutoff",
    "PAO.BasisType",
    "PAO.BasisSize",
    "PAO.EnergyShift",
    "XC.functional",
    "XC.authors",
    "MaxSCFIterations",
    "SolutionMethod",
    "DM.MixingWeight",
    "DM.NumberPulay",
    "DM.Tolerance",
    "DM.Require.Energy.Convergence",
    "DM.Energy.Tolerance",
    "SCF.MixAfterConvergence",
    "DM.FormattedFiles",
    "DM.FormattedOutput",
    "MD.TypeOfRun",
    "MD.NumCGsteps",
    "MD.MaxForceTol",
    "MD.VariableCell",
    "MD.ConstantVolume",
    "MD.UseSaveXV",
    "MD.UseSaveCG",
    "MD.MaxStressTol",
    "WriteMDHistory",
    "WriteMDXMol",
    "MD.MaxCGDispl",
    "SpinPolarized",
    "FixSpin",
    "NonCollinearSpin",
    "DM.InitSpinAF",
    "ON.UseSaveLWF",
    "DM.UseSaveDM",
    "UseSaveData",
    "LongOutput",
    "WriteKbands",
    "WriteBands",
    "WriteCoorXmol",
    "WriteCoorStep",
    "WriteKpoints",
    "WriteCoorCerius",
    "WriteHS",
    "WriteForces",
    "WriteMullikenPop",
    "SaveHS",
    "XML.Write",
    "TotalSpin",
    "CommentBlock"
];
availableTags.sort();

$("#searchConstant").autocomplete({
    maxShowItems: 5,
    source: availableTags,
    minLength: 0
}).focus(function() {
    $(this).autocomplete("search", $(this).val());
});

$(".nav-group").draggable({
    connectToSortable: "form",
    helper: "clone"
});

const siestaConstants = [
    {
        "name": "WriteKbands",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет будут ли записываться в главный выходной файл координаты k−векторов, используемых для построения зонной структуры"
    },
    {
        "name": "WriteBands",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет выводятся ли в основной выходной файл собственные значения Гамильтониана, соответствующие k−векторам. Эта переменная используется только если SolutionMethod = diagon. Значение по умолчанию: false"
    },
    {
        "name": "WriteCoorStep",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет будут ли на каждом шаге моделирования молекулярной динамики или оптимизации структуры выводиться в главный выходной файл координаты атомов"
    },
    {
        "name": "WriteCoorXmol",
        "type": "boolean",
        "default": "T",
        "tooltip": ""
    },
    {
        "name": "WriteKpoints",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет будут ли записываться в главный выходной файл координаты узлов сетки в k−пространстве"
    },
    {
        "name": "WriteCoorCerius",
        "type": "boolean",
        "default": "T",
        "tooltip": ""
    },
    {
        "name": "WriteHS",
        "type": "boolean",
        "default": "T",
        "tooltip": ""
    },
    {
        "name": "WriteForces",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет будут ли на каждом шаге моделирования выводиться в выходной файл силы, действующие на атомы"
    },
    {
        "name": "WriteMullikenPop",
        "type": "boolean",
        "default": "T",
        "tooltip": "Определяет степень детализированности выводимых в выходной файл результатов анализа заселенности по Милликену:\n 0: не выводится;\n1: заселенности атомов и орбиталей;\n2: 1 + заселенность области перекрытия атомов;\n3: 2 + заселенность перекрытия орбиталей"
    },
    
    {
        "name": "SpinPolarized",
        "type": "boolean",
        "default": "T",
        "tooltip": "Логическая переменная для выбора неполяризованного (false) и поляризованного (true) по спину расчета. Значение по умолчанию: false."
    },
    {
        "name": "FixSpin",
        "type": "boolean",
        "default": "T",
        "tooltip": "Если эта переменная равна true, расчет проводится с фиксированным значением полного спина системы, заданного переменной TotalSpin. Эта опция может быть использована только при расчете с коллинеарным спином. Значение по умолчанию: false."
    },
    {
        "name": "TotalSpin",
        "type": "float",
        "default": "0.0",
        "tooltip": "Спин системы (в единицах спина электрона, 1/2). Параметр используется только если FixSpin = True. Значение по умолчанию: 0.0."
    },
    {
        "name": "CommentBlock",
        "type": "multiline",
        "default": "",
        "tooltip": "Используется для написания пользовательских комментариев."
    }
]

$(".constant-add").on("click", function () {
    let field = $("#searchConstant").val()
    let result = false;
    let found = null;
    $.map(siestaConstants, function(elem, index) {
        if (elem.name == field) 
        {
            result = true
            found = elem
        }
    });
    if(result && $(`input[name="${found.name}"`).length == 0){
        let formGroup = $('<div>', {
            class: 'form-group context-menu-one',
            title: (found.tooltip!=="") ? found.tooltip : "No description provided"
        });
        let label = $("<label>", {text: found.name, })
        formGroup.tooltip();
        let input = null;
        switch(found.type){
            case "boolean":
                input = $("<input>", {class: "constant-value", name: found.name, type: "checkbox"})
                formGroup.removeClass("form-group").addClass("form-group-checkbox")
                break;
            case "multiline":
                input = $("<textarea>", {class: "form-control constant-value comment-block", style: "resize: vertical", name: found.name, placeholder: found.name})
                break;
            case "string":
            default:
                input = $("<input>", {class: "form-control constant-value", name: found.name, value: found.default, placeholder: found.name})
                break;
        }
        formGroup.append(label, input)
        formGroup.insertBefore($("#save-form"));
    }
    $("#searchConstant").val("")
});


$.contextMenu({
    selector: '.context-menu-one', 
    callback: function(key, options) {
        $(this).remove();
    },
    items: {
        "delete": {name: "Delete", icon: "delete"}
    }
});

$('.context-menu-one').on('click', function(e){
    console.log('clicked', this);
})    

$('form').sortable({
    items: "> *:not(.form-actions, .static)",
    axis: "y"
});