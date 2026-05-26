import { SpreadsheetFile } from '../types';

export const sampleMotherFile: SpreadsheetFile = {
  id: 'mother-sample',
  name: 'EDIÇÃO_Cadastro_Componentes_Oficial_2026.xlsx',
  size: 14520, // fictive size
  type: 'mother',
  headers: [
    'ID do Sistema',
    'Part Number (Coluna B)',
    'Descrição Completa',
    'Categoria',
    'Estoque Mínimo',
    'Preço Unitário (R$)',
    'Status Cadastro',
    'Fabricante (Coluna H)',
    'Localização Gaveta',
    'ID Lote (Coluna J)'
  ],
  rows: [
    // Header row (resembles raw xlsx output)
    [
      'ID do Sistema',
      'Part Number (Coluna B)',
      'Descrição Completa',
      'Categoria',
      'Estoque Mínimo',
      'Preço Unitário (R$)',
      'Status Cadastro',
      'Fabricante (Coluna H)',
      'Localização Gaveta',
      'ID Lote (Coluna J)'
    ],
    // Registered components
    ['1001', 'RES-10K-0805', 'Resistor SMD 10K Ohms 5% 0805', 'Resistores', '500', '0.05', 'Ativo', 'Yageo', 'A-12', 'LT-100'],
    ['1002', 'CAP-10UF-16V', 'Capacitor Cerâmico SMD 10uF 16V 1206', 'Capacitores', '200', '0.12', 'Ativo', 'Samsung', 'B-03', 'LT-101'],
    ['1003', 'IC-NE555-SOIC', 'Circuito Integrado Temporizador NE555 SOIC-8', 'Semicondutores', '50', '1.50', 'Ativo', 'Texas Instruments', 'C-08', 'LT-102'],
    ['1004', 'CON-HE10-10P', 'Conector HE10 IDC Macho 10 Vias', 'Conectores', '100', '0.85', 'Ativo', 'Amphenol', 'D-02', 'LT-103'],
    ['1005', 'DI-1N4148-SOD123', 'Diodo de Sinal Rápido 1N4148 SOD-123', 'Diodos', '300', '0.08', 'Ativo', 'Diodes Inc', 'A-04', 'LT-104'],
    ['1006', 'LED-3MM-VERD', 'LED Difuso Verde 3mm Redondo', 'Optoeletrônicos', '400', '0.15', 'Ativo', 'Everlight', 'E-01', 'LT-105'],
    ['1007', 'ESP32-WROOM-32D', 'Módulo WiFi/Bluetooth ESP32-WROOM-32D', 'Módulos', '30', '28.00', 'Ativo', 'Espressif', 'F-15', 'LT-106']
  ]
};

export const sampleChildFile: SpreadsheetFile = {
  id: 'child-sample-1',
  name: 'Lista_Compra_Projeto_Robótica_Nova.xlsx',
  size: 8940,
  type: 'child',
  headers: [
    'Item Projeto',
    'Part Number (Coluna B)',
    'Quantidade Solicitada',
    'Setor Uso',
    'Urgência',
    'Nota',
    'Preço Estimado',
    'Fabricante (Coluna H)',
    'Subcategoria',
    'Identificador ID (Coluna J)'
  ],
  rows: [
    [
      'Item Projeto',
      'Part Number (Coluna B)',
      'Quantidade Solicitada',
      'Setor Uso',
      'Urgência',
      'Nota',
      'Preço Estimado',
      'Fabricante (Coluna H)',
      'Subcategoria',
      'Identificador ID (Coluna J)'
    ],
    // Existing item
    ['1', 'RES-10K-0805', '100', 'Engenharia', 'Baixa', '', '0.05', 'Yageo', 'Fixo', 'LT-100'],
    
    // New item (Part Number is not in mother)
    ['2', 'RES-47K-0805', '50', 'Engenharia', 'Média', 'Novo componente para sensor', '0.05', 'Yageo', 'Fixo', 'ID-ABCD-99'],
    
    // REDUNDANT/REPLICATED NEW ITEM (Same Part Number, same Manufacturer Yageo, SAME Column J 'ID-ABCD-99' - Duplicate By H+J combination!)
    ['2-REPLICA-1', 'RES-47K-0805', '50', 'Engenharia', 'Média', 'Replicado via lote extra', '0.05', 'Yageo', 'Fixo', 'ID-ABCD-99'],
    
    // Existing Part Number but DIFFERENT Manufacturer! (This is what user warned about: Row B matches but Row H is different!)
    ['3', 'IC-NE555-SOIC', '10', 'Manutenção', 'Alta', 'Solicitado fabricante alternativo', '1.65', 'STMicroelectronics', 'CIs', 'ID-884-ST'],
    
    // Another Duplicate - Explicity marked as duplicate in Column J
    ['3-REPLICA-2', 'IC-NE555-SOIC', '5', 'Manutenção', 'Alta', 'Item replicado', '1.65', 'STMicroelectronics', 'CIs', 'Duplicado'],

    // Existing item
    ['4', 'CAP-10UF-16V', '30', 'Engenharia', 'Baixa', '', '0.12', 'Samsung', 'SMD', 'LT-101'],
    
    // Brand new item in general
    ['5', 'TRANS-2N3904-SOT23', '150', 'Engenharia', 'Média', 'Transitores de chaveamento', '0.22', 'ON Semi', 'Discretos', 'ID-TRANS-FAST'],
    
    // Brand new item
    ['6', 'MCU-STM32F103C8T6', '15', 'Engenharia', 'Alta', 'Placa BluePill de controle', '18.50', 'STMicroelectronics', 'Microcontroladores', 'ID-BLUEPILL'],
    
    // Existing item
    ['7', 'ESP32-WROOM-32D', '5', 'Robótica', 'Alta', '', '28.00', 'Espressif', 'Módulos RF', 'LT-106']
  ]
};
