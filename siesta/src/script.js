import * as THREE from './js/three.module.js';
import { OrbitControls } from './js/OrbitControls.js';

let scene, camera, renderer, controls;
let atomGeometry, atomMaterial;
let atoms = [];
let bonds = [];
let plane;

let selectedAtom = null;
let mode = 'addAtom';
let currentElement = 'H';
let selectedElements = ['H', 'C', 'O', 'N', 'S']; // Default elements

// Colors corresponding to the fixed positions on the main panel
const positionColors = [0xffffff, 0xA64D79, 0xff0000, 0x0000ff, 0xffff00];

const elementColors = {
    'H': 0xffffff,
    'C': 0xA64D79,
    'O': 0xff0000,
    'N': 0x0000ff,
    'S': 0xffff00,
    // Add more elements with their respective colors if needed
};

init();
animate();

function init() {
    const canvas = document.querySelector('#canvas');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2; // Уменьшите, если необходимо

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', updatePlane);

    atomGeometry = new THREE.SphereGeometry(0.05, 32, 32); // Уменьшенный размер атомов

    window.addEventListener('resize', onWindowResize, false);
    canvas.addEventListener('dblclick', onCanvasDblClick);
    canvas.addEventListener('click', onCanvasClick);

    const addAtomButton = document.getElementById('mode-add-atom');
    const deleteButton = document.getElementById('mode-delete');
    const configureButton = document.getElementById('configure-elements');

    addAtomButton.addEventListener('click', () => {
        mode = 'addAtom';
        addAtomButton.classList.add('button-active');
        deleteButton.classList.remove('button-active');
    });

    deleteButton.addEventListener('click', () => {
        mode = 'delete';
        deleteButton.classList.add('button-active');
        addAtomButton.classList.remove('button-active');
    });

    configureButton.addEventListener('click', toggleConfigureElementsPanel);

    updateMainPanelElements();
    updatePlane();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updatePlane() {
    const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    plane = new THREE.Plane(normal, -camera.position.distanceTo(new THREE.Vector3()));
}

const ATOM_DISTANCE_FROM_CAMERA = 1.5; // Оставляем текущее значение
let COORDINATE_SCALE = 0.05; // Новая константа для масштабирования координат


//меняем скейл как нужно пользователю 
// Получаем элементы управления
const coordinateScaleInput = document.getElementById('coordinate-scale-input');
const applyCoordinateScaleBtn = document.getElementById('apply-coordinate-scale');

// Обработчик для кнопки "Apply"
applyCoordinateScaleBtn.addEventListener('click', function() {
    // Получаем новое значение из поля ввода
    const newScale = parseFloat(coordinateScaleInput.value);
    
    // Проверяем, что значение находится в допустимом диапазоне
    if (newScale >= 0.01 && newScale <= 1.0) {
        // Обновляем значение переменной COORDINATE_SCALE
        COORDINATE_SCALE = newScale;
        console.log("New coordinate scale applied: ", COORDINATE_SCALE);
    } else {
        console.error("Invalid coordinate scale value. It should be between 0.01 and 1.0.");
    }
});


function onCanvasDblClick(event) {
    if (mode !== 'addAtom') return;

    const colorIndex = selectedElements.indexOf(currentElement);
    const color = positionColors[colorIndex];
    atomMaterial = new THREE.MeshBasicMaterial({ color });

    const canvas = renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const mouseY = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    const mouse = new THREE.Vector2(mouseX, mouseY);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Найдите точку пересечения с плоскостью параллельной экрану
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    // Найдите направление от камеры к точке пересечения
    const cameraToIntersection = intersection.clone().sub(camera.position).normalize();

    // Разместите атом перед камерой, но не слишком близко
    const newPosition = camera.position.clone().add(cameraToIntersection.multiplyScalar(ATOM_DISTANCE_FROM_CAMERA));

    const atom = new THREE.Mesh(atomGeometry, atomMaterial);
    atom.position.copy(newPosition);
    atom.userData = { element: currentElement };
    scene.add(atom);
    atoms.push(atom);

    // Масштабирование координат перед добавлением в таблицу
    const scaledPosition = {
        x: newPosition.x * COORDINATE_SCALE,
        y: newPosition.y * COORDINATE_SCALE,
        z: newPosition.z * COORDINATE_SCALE,
    };

    updateChemicalFormula();
    updateAtomicCoordinatesTable();
}
   

function addAtomToTable(element, position) {
    const table = document.getElementById('coordinates-table');
    const newRow = table.insertRow();

    const cellX = newRow.insertCell(0);
    const cellY = newRow.insertCell(1);
    const cellZ = newRow.insertCell(2);
    const cellElement = newRow.insertCell(3);

    cellX.innerText = position.x.toFixed(3);
    cellY.innerText = position.y.toFixed(3);
    cellZ.innerText = position.z.toFixed(3);
    cellElement.innerText = element;
}

function onCanvasClick(event) {
    const canvas = renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const mouseY = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    const mouse = new THREE.Vector2(mouseX, mouseY);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(atoms);

    if (mode === 'delete' && intersects.length > 0) {
        const atom = intersects[0].object;
        scene.remove(atom);
        atoms = atoms.filter(a => a !== atom);

        // Удаление связей, в которых участвует удаленный атом
        bonds = bonds.filter(bondData => {
            if (bondData.atom1 === atom || bondData.atom2 === atom) {
                scene.remove(bondData.bond);
                return false; // Удаляем связь из массива bonds
            }
            return true; // Оставляем связь в массиве bonds
        });

        updateChemicalFormula();
        updateAtomicCoordinatesTable();
    }
}


function toggleConfigureElementsPanel() {
    const additionalElementsPanel = document.getElementById('additional-elements-panel');
    if (additionalElementsPanel.style.display === 'flex') {
        additionalElementsPanel.style.display = 'none';
    } else {
        additionalElementsPanel.style.display = 'flex';
        configureElements();
    }
}

function configureElements() {
    const additionalElementsPanel = document.getElementById('additional-elements-panel');
    additionalElementsPanel.innerHTML = ''; // Очищаем панель перед добавлением новых элементов

    const periodicTableElements = [  'H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'];

    const selectedSet = new Set(selectedElements);

    periodicTableElements.forEach(element => {
        const button = document.createElement('div');
        button.className = 'additional-element-button';
        button.setAttribute('data-element', element);
        button.textContent = element;

        // Если элемент уже выбран, делаем его активным
        if (selectedSet.has(element)) {
            button.classList.add('selected-element');
        }

        button.addEventListener('click', () => {
            const element = button.getAttribute('data-element');

            // Если элемент уже выбран, убираем его
            if (selectedSet.has(element)) {
                selectedSet.delete(element);
                button.classList.remove('selected-element');
            } else {
                // Проверяем, что можно выбрать не больше 5 элементов
                if (selectedSet.size < 5) {
                    selectedSet.add(element);
                    button.classList.add('selected-element');
                } else {
                    alert('You can only select up to 5 elements.');
                }
            }

            selectedElements = Array.from(selectedSet);
            updateMainPanelElements();
        });

        additionalElementsPanel.appendChild(button);
    });
}

function updateMainPanelElements() {
    const elementPanel = document.getElementById('element-panel');
    elementPanel.innerHTML = ''; // Очищаем панель перед добавлением новых элементов

    selectedElements.forEach((element, index) => {
        const button = document.createElement('div');
        button.className = 'element-button';
        button.setAttribute('data-element', element);
        button.textContent = element;
        button.style.backgroundColor = `#${positionColors[index].toString(16).padStart(6, '0')}`;
        button.style.color = (positionColors[index] === 0x000000) ? 'white' : 'black';
        button.addEventListener('click', () => {
            currentElement = element;
            document.querySelectorAll('.element-button').forEach(btn => btn.classList.remove('selected-element'));
            button.classList.add('selected-element');
        });
        elementPanel.appendChild(button);
    });

    // Выбираем первый элемент по умолчанию
    currentElement = selectedElements[0];
    document.querySelector('.element-button').classList.add('selected-element');
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
document.getElementById('submit-button').addEventListener('click', handleFormSubmit);

function handleFormSubmit() {
    const systemLabel = document.getElementById('syslabel').value;
    const table = document.getElementById('coordinates-table');
    const atomsData = parseAtomicCoordinates(systemLabel, table);
    visualizeAtoms(atomsData);
}

function parseAtomicCoordinates(systemLabel, table) {
    const rows = table.querySelectorAll('tr:not(.hide)'); // Исключаем скрытую строку-шаблон
    const atoms = [];
    
    rows.forEach(row => {
        const cells = row.children;
        const x = parseFloat(cells[0].innerText);
        const y = parseFloat(cells[1].innerText);
        const z = parseFloat(cells[2].innerText);
        const element = cells[3].innerText;
        
        atoms.push({ element, position: { x, y, z } });
    });

    return atoms;
}

function visualizeAtoms(atomsData) {
    // Очистка предыдущих атомов и связей
    atoms.forEach(atom => scene.remove(atom));
    bonds.forEach(bondData => scene.remove(bondData.bond));
    atoms = [];
    bonds = [];

    atomsData.forEach(atomData => {
        const color = elementColors[atomData.element] || 0xffffff;
        const material = new THREE.MeshBasicMaterial({ color });
        const atom = new THREE.Mesh(atomGeometry, material);
        atom.position.set(atomData.position.x, atomData.position.y, atomData.position.z);
        atom.userData = { element: atomData.element };
        scene.add(atom);
        atoms.push(atom);
    });

    renderer.render(scene, camera);
}
const templateRow = document.querySelector('#coordinates-table .hide').cloneNode(true);
//очистка сцены 
document.getElementById('clear-scene').addEventListener('click', () => {
    // Очистка сцены
    atoms.forEach(atom => scene.remove(atom));
    bonds.forEach(bondData => scene.remove(bondData.bond));
    atoms = [];
    bonds = [];

    // Очистка таблицы
    const tableBody = document.querySelector('#coordinates-table tbody');
    tableBody.innerHTML = ''; // Удаляем все строки, кроме заголовка

    // Показываем шаблонную строку перед добавлением
    const clonedRow = templateRow.cloneNode(true);
    clonedRow.classList.remove('hide');
    tableBody.appendChild(clonedRow);
});

//обновление формулы
function updateChemicalFormula() {
    const elementCounts = atoms.reduce((counts, atom) => {
        const element = atom.userData.element;
        counts[element] = (counts[element] || 0) + 1;
        return counts;
    }, {});

    const formula = Object.entries(elementCounts)
        .map(([element, count]) => count > 1 ? `${element}${count}` : element)
        .join('');

    document.getElementById('syslabel').value = formula;
}

function updateAtomicCoordinatesTable() {
    const tableBody = document.querySelector('#coordinates-table tbody');
    tableBody.innerHTML = ''; // Удаляем все строки

    atoms.forEach(atom => {
        const row = document.createElement('tr');
        const xCell = document.createElement('td');
        const yCell = document.createElement('td');
        const zCell = document.createElement('td');
        const atomCell = document.createElement('td');

        xCell.textContent = atom.position.x.toFixed(3);
        yCell.textContent = atom.position.y.toFixed(3);
        zCell.textContent = atom.position.z.toFixed(3);
        atomCell.textContent = atom.userData.element;

        row.appendChild(xCell);
        row.appendChild(yCell);
        row.appendChild(zCell);
        row.appendChild(atomCell);
        tableBody.appendChild(row);
    });
}

// Добавляем обработчик для кнопки очистки
document.getElementById('clear-scene').addEventListener('click', () => {
    atoms.forEach(atom => scene.remove(atom));
    bonds.forEach(bondData => scene.remove(bondData.bond));
    atoms = [];
    bonds = [];
    updateChemicalFormula();
    updateAtomicCoordinatesTable();
});