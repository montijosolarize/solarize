document.addEventListener('DOMContentLoaded', function() {
    console.log("Script carregado!"); // Verifique se aparece no console
    
    document.getElementById('calculate').addEventListener('click', function() {
        console.log("Botão calculou!"); // Verifique se aparece ao clicar
        
        // Cálculo de teste
        const area = parseFloat(document.getElementById('area').value) || 50;
        const panelType = document.getElementById('panel-type').value;
        
        // Mostra resultados mesmo sem API
        document.getElementById('panel-count').textContent = Math.floor(area / 1.5);
        document.getElementById('total-area').textContent = area;
        document.getElementById('energy-output').textContent = (area * 0.2).toFixed(1);
        
        document.getElementById('results').classList.remove('hidden');
        console.log("Resultados deveriam estar visíveis!");
    });
});
