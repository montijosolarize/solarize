document.addEventListener('DOMContentLoaded', function() {
    console.log("Script carregado com sucesso!");
    
    let map, marker, coordinates = null;
    
    // Inicializa o mapa
    function initMap(lat = -15.7942, lng = -47.8822) {
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
                    updateOptimalTilt();
                }
            });
    });
    
    // Calcula o ângulo ideal (~latitude local)
    function updateOptimalTilt() {
        if (!coordinates) return;
        const optimalTilt = Math.min(Math.max(Math.round(coordinates.lat * 0.9), 10), 35);
        document.getElementById('optimal-tilt').textContent = `(Recomendado: ${optimalTilt}°)`;
        document.getElementById('tilt').value = optimalTilt;
        document.getElementById('tilt-value').textContent = `${optimalTilt}°`;
    }
    
    // Calcula espaçamento entre painéis
    function calculateSpacing(panelHeight, tilt) {
        const tiltRad = tilt * (Math.PI / 180);
        return (panelHeight * Math.sin(tiltRad) * 1.5).toFixed(1);
    }
    
    // Simulação de dados solares (substitua por API real se necessário)
    async function getSolarData(lat, lng) {
        // Valor médio para Brasil (kWh/m²/ano)
        return 1600; 
    }
    
    // Cálculo principal
    document.getElementById('calculate').addEventListener('click', async function() {
        if (!coordinates) {
            alert("Por favor, busque um local válido primeiro!");
            return;
        }
        
        // Obter valores dos inputs
        const area = parseFloat(document.getElementById('area').value) || 0;
        const panelType = document.getElementById('panel-type').value;
        const tilt = parseInt(document.getElementById('tilt').value);
        const azimuth = parseInt(document.getElementById('azimuth').value);
        const spacing = parseFloat(document.getElementById('spacing').value);
        const energyCost = parseFloat(document.getElementById('energy-cost').value) || 0.80;
        const systemCostPerWatt = parseFloat(document.getElementById('system-cost').value) || 4.50;
        
        if (area <= 0) {
            alert("Por favor, insira uma área válida!");
            return;
        }
        
        // Especificações dos painéis (potência em W, tamanho em m)
        const panelSpecs = {
            '330': { width: 1.0, height: 1.6, power: 330 },
            '550': { width: 1.1, height: 2.2, power: 550 },
            '600': { width: 1.2, height: 2.4, power: 600 }
        };
        
        const panel = panelSpecs[panelType] || panelSpecs['550'];
        const panelArea = panel.width * panel.height;
        const panelCount = Math.floor(area / panelArea);
        const totalPowerKW = (panelCount * panel.power) / 1000;
        
        // Cálculo de geração de energia (simplificado)
        const irradiance = await getSolarData(coordinates.lat, coordinates.lng);
        const performanceRatio = 0.75 * (1 - 0.005 * Math.abs(azimuth - 180)) * (1 - 0.005 * Math.abs(tilt - 30));
        const annualEnergyKWh = Math.round(totalPowerKW * irradiance * performanceRatio);
        const monthlyEnergyKWh = Math.round(annualEnergyKWh / 12);
        
        // Cálculos financeiros
        const totalCost = (totalPowerKW * 1000 * systemCostPerWatt).toFixed(2);
        const annualSavings = (annualEnergyKWh * energyCost).toFixed(2);
        const paybackYears = (totalCost / annualSavings).toFixed(1);
        const roi10Years = ((annualSavings * 10 / totalCost - 1) * 100).toFixed(1);
        
        // Atualiza a interface
        document.getElementById('panel-count').textContent = panelCount;
        document.getElementById('total-power').textContent = totalPowerKW.toFixed(2);
        document.getElementById('total-area').textContent = (panelCount * panelArea).toFixed(1);
        document.getElementById('optimal-angle').textContent = `${tilt}°`;
        document.getElementById('optimal-spacing').textContent = calculateSpacing(panel.height, tilt);
        document.getElementById('irradiance').textContent = irradiance;
        document.getElementById('energy-month').textContent = monthlyEnergyKWh;
        document.getElementById('energy-year').textContent = annualEnergyKWh;
        document.getElementById('total-cost').textContent = totalCost;
        document.getElementById('annual-savings').textContent = annualSavings;
        document.getElementById('payback').textContent = paybackYears;
        document.getElementById('roi').textContent = roi10Years;
        
        document.getElementById('results').classList.remove('hidden');
        
        // Atualiza o mapa
        if (map) {
            map.eachLayer(layer => { if (layer instanceof L.Rectangle) map.removeLayer(layer); });
            
            const side = Math.sqrt(panelCount * panelArea);
            const latOffset = side / 111320;
            const lngOffset = side / (111320 * Math.cos(coordinates.lat * Math.PI / 180));
            
            L.rectangle([
                [coordinates.lat - latOffset/2, coordinates.lng - lngOffset/2],
                [coordinates.lat + latOffset/2, coordinates.lng + lngOffset/2]
            ], { 
                color: '#ff7800', 
                weight: 2,
                fillOpacity: 0.5,
                fillColor: '#ff7800'
            }).addTo(map).bindPopup(`<b>Área da Usina</b><br>${(panelCount * panelArea).toFixed(1)} m²<br>${panelCount} painéis`);
        }
    });
    
    // Atualiza valor do slider de inclinação
    document.getElementById('tilt').addEventListener('input', function() {
        document.getElementById('tilt-value').textContent = `${this.value}°`;
    });
    
    initMap(); // Inicia o mapa
});
