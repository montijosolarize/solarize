document.addEventListener('DOMContentLoaded', function() {
    let map, marker, coordinates = null;
    
    // Inicializa o mapa
    function initMap(lat = -15.7942, lng = -47.8822) { // Brasília como padrão
        if (map) map.remove();
        
        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        if (marker) marker.remove();
        marker = L.marker([lat, lng]).addTo(map).bindPopup("Local da Usina").openPopup();
    }
    
    // Busca coordenadas
    document.getElementById('search').addEventListener('click', function() {
        const address = document.getElementById('address').value;
        if (!address) return;
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            .then(res => res.json())
            .then(data => {
                if (data[0]) {
                    coordinates = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    initMap(coordinates.lat, coordinates.lng);
                    updateOptimalTilt(); // Atualiza ângulo ideal
                }
            });
    });
    
    // Calcula o ângulo ideal (regra geral: ~latitude local)
    function updateOptimalTilt() {
        if (!coordinates) return;
        const optimalTilt = Math.min(Math.max(Math.round(coordinates.lat * 0.9), 10), 35);
        document.getElementById('optimal-tilt').textContent = `(Recomendado: ${optimalTilt}°)`;
        document.getElementById('tilt').value = optimalTilt;
        document.getElementById('tilt-value').textContent = `${optimalTilt}°`;
    }
    
    // Calcula espaçamento para evitar sombreamento
    function calculateSpacing(panelHeight, tilt) {
        const tiltRad = tilt * (Math.PI / 180);
        return (panelHeight * Math.sin(tiltRad) * 1.5).toFixed(1); // +50% de margem
    }
    
    // Obtém dados de irradiação da NASA
    async function fetchSolarData(lat, lng) {
        const response = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?latitude=${lat}&longitude=${lng}&start=20230101&end=20231231&community=RE&parameters=ALLSKY_SFC_SW_DWN&format=JSON`);
        const data = await response.json();
        const dailyIrradiance = Object.values(data.properties.ALLSKY_SFC_SW_DWN);
        return (dailyIrradiance.reduce((a, b) => a + b, 0) / 3.6 / dailyIrradiance.length * 365).toFixed(1); // kWh/m²/ano
    }
    
    // Cálculo principal
    document.getElementById('calculate').addEventListener('click', async function() {
        if (!coordinates) return alert("Defina uma localização!");
        
        const area = parseFloat(document.getElementById('area').value);
        const panelType = document.getElementById('panel-type').value;
        const tilt = parseInt(document.getElementById('tilt').value);
        const azimuth = parseInt(document.getElementById('azimuth').value);
        const spacing = parseFloat(document.getElementById('spacing').value);
        const energyCost = parseFloat(document.getElementById('energy-cost').value);
        const systemCost = parseFloat(document.getElementById('system-cost').value);
        
        // Dimensões dos painéis (m²) e potência (W)
        const panelSpecs = {
            '330': { width: 1.0, height: 1.6, power: 330 },
            '550': { width: 1.1, height: 2.2, power: 550 },
            '600': { width: 1.2, height: 2.4, power: 600 }
        };
        
        const panel = panelSpecs[panelType];
        const panelArea = panel.width * panel.height;
        const panelCount = Math.floor(area / panelArea);
        const totalPower = (panelCount * panel.power) / 1000; // kWp
        
        // Irradiação solar
        const irradiance = await fetchSolarData(coordinates.lat, coordinates.lng) || 1600; // kWh/m²/ano (padrão se API falhar)
        
        // Fórmula simplificada de geração (considerando eficiência ~80%)
        const energyYear = (totalPower * irradiance * 0.8).toFixed(0);
        const energyMonth = (energyYear / 12).toFixed(0);
        
        // Cálculo financeiro
        const totalCost = (totalPower * 1000 * systemCost).toFixed(2);
        const annualSavings = (energyYear * energyCost).toFixed(2);
        const payback = (totalCost / annualSavings).toFixed(1);
        const roi = ((annualSavings * 10 / totalCost - 1) * 100).toFixed(1);
        
        // Atualiza resultados
        document.getElementById('panel-count').textContent = panelCount;
        document.getElementById('total-power').textContent = totalPower;
        document.getElementById('total-area').textContent = (panelCount * panelArea).toFixed(1);
        document.getElementById('optimal-angle').textContent = `${tilt}°`;
        document.getElementById('optimal-spacing').textContent = calculateSpacing(panel.height, tilt);
        document.getElementById('irradiance').textContent = irradiance;
        document.getElementById('energy-month').textContent = energyMonth;
        document.getElementById('energy-year').textContent = energyYear;
        document.getElementById('total-cost').textContent = totalCost;
        document.getElementById('annual-savings').textContent = annualSavings;
        document.getElementById('payback').textContent = payback;
        document.getElementById('roi').textContent = roi;
        
        document.getElementById('results').classList.remove('hidden');
        
        // Desenha área no mapa
        if (map) {
            map.eachLayer(layer => { if (layer instanceof L.Rectangle) map.removeLayer(layer); });
            
            const side = Math.sqrt(panelCount * panelArea);
            const latOffset = side / 111320;
            const lngOffset = side / (111320 * Math.cos(coordinates.lat * Math.PI / 180));
            
            L.rectangle([
                [coordinates.lat - latOffset/2, coordinates.lng - lngOffset/2],
                [coordinates.lat + latOffset/2, coordinates.lng + lngOffset/2]
            ], { color: '#ff7800', fillOpacity: 0.5 }).addTo(map)
              .bindPopup(`<b>Área da Usina</b><br>${(panelCount * panelArea).toFixed(1)} m²<br>${panelCount} painéis`);
        }
    });
    
    // Atualiza valor do slider de inclinação
    document.getElementById('tilt').addEventListener('input', function() {
        document.getElementById('tilt-value').textContent = `${this.value}°`;
    });
    
    initMap(); // Inicia mapa
});
