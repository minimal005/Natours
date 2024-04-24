/* eslint-disable */

export const displayMap = (locations) => {
  // з сайту використовуємо свій токен
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWluaW1hbDAwNSIsImEiOiJjbHY4Ymp2d24wYnFzMmtsa3l5ZzV4cmFoIn0.7BfUm9VxOmDPoYazEoL-XQ';

  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/minimal005/clv8fikmf008501qzgat6dkb9', // style URL
    zoom: 9, // starting zoom
    scrollZoom: false, //заборона скрола, але є можливість перетягування карти
    // тобто ми не можемо скролити
    // interactive: false, //заборона скрола і перетягування карти
  });

  // це об'єкт межі, територія яка відображатиметься на карті
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');

    //в стилях прописаний .marker
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates) // передаємо координати тура
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30, //зміщуємо попапи по відношенню до маркера, щоб не перекривав його
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // розширюємо межі мапи, що включити поточні координати
    bounds.extend(loc.coordinates);
  });

  //робимо, щоб карта дійсно вписувалась в межі
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
