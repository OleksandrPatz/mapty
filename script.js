'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Usually we dont create ID by ourselfes, we use some library for it
// Parent class Workout.
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng ]
    this.distance = distance; // mr
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

//create child classes of Workout class
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  //
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// create class for cycling program
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// build class for app
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    // call  _getPosition() to get position. and load map at the page loads
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach evnt handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Geolocation
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.log("Can't get your coordinates");
        }
      );
  }

  _loadMap(p) {
    // position
    const { latitude } = p.coords;
    const { longitude } = p.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.fr/hot/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    const newLocal = 'My position ';
    L.marker(coords).addTo(this.#map);

    // Handling click on map
    this.#map.on('click', this._showForm.bind(this));

    // render the markers from storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => ((form.style.display = 'grid'), 1000));
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Create new Workout
  _newWorkout(e) {
    //helper function
    const validInput = (...inputs) =>
      inputs.every(currINput => Number.isFinite(currINput));
    const allPositive = (...input) => input.every(inp => inp > 0);

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // check if data is valid.
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance > 0, duration > 0, cadence > 0)
      )
        return alert('Input should be positive number');

      // collect all data for create new workout
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // create an object depending on the type of training
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance > 0, duration > 0)
      )
        return alert('Input should be positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new obj to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on a list
    this._renderWorkout(workout);
    
    // Hide form + clear input fields
    this._hideForm();

    // set local storage for all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // Store the marker reference
    this.#markers.push(marker);
  }

  // create aside with workout dadat. DOM
  _renderWorkout(workout) {
    let html = ` 
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <button class="btn btn-delete">❌</button>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        </li>
      `;

    if (workout.type === 'cycling')
      html += ` <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </li> 
    `;

    // add sibling element to the form
    form.insertAdjacentHTML('afterend', html);

    // Select delete button.
    const deleteBtn = document.querySelector(
      `[data-id="${workout.id}"] .btn-delete`
    );

    // attached event listener to the btn
    deleteBtn.addEventListener('click', () => {
      // Select workout to be deleted
      const workoutItem = deleteBtn.closest('.workout');

      // Remove the marker associated with the workout from the map
      this.removeMarker(workout.id);

      workoutItem.remove();
    });
  }

  // Remove marker
  removeMarker(workoutId) {
    // Find the index of the workout with the given ID in the workouts array
    const workoutIndex = this.#workouts.findIndex(
      work => work.id === workoutId
    );

    if (workoutIndex === -1) return;

    // Remove the marker associated with the workout from the map
    this.#map.removeLayer(this.#markers[workoutIndex]);

    // Remove the marker reference from the markers array
    this.#markers.splice(workoutIndex, 1);

    // Remove the workout from the workouts array
    this.#workouts.splice(workoutIndex, 1);

    // Update local storage to reflect the changes
    this._setLocalStorage();
  }

  // Move map to the certain el.
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    // to select clicked workout.
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // move map to the target.
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  //  Use local storage API.
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // render each workout on sidebar
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  // remove workouts from storage
  reset() {
    localStorage.removeItem('workouts');
    // reload the page programaticaly. Local = big object  includes a lot of methods
    location.reload();
  }
}

const app = new App();
