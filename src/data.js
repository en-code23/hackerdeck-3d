export const PRICE_DATE = '16.08.2026';

export const baseParts = [
  {id:'shell', name:'3D-gedrucktes Gehäuse', qty:1, price:8.00, priceType:'estimate', dims:[116,169,30], source:'Schätzung für PLA/PETG; abhängig von Druckservice und Material'},
  {id:'display', name:'3.5″ SPI TFT ILI9488', qty:1, price:22.95, dims:[98,56.3,6], source:'https://www.fruugo.de/35-zoll-spi-lcd-modul-mit-serieller-schnittstelle-und-tft-display-ili9488-multifunktions-tragbar-mit-kapazitivem-tou/p-360270940-783374477'},
  {id:'s3', name:'ESP32-S3-DevKitC-1U-N8R8', qty:1, price:12.90, dims:[25.4,63,11], source:'https://www.mouser.de/ProductDetail/Espressif-Systems/ESP32-S3-DevKitC-1U-N8R8'},
  {id:'c5', name:'ESP32-C5-WROOM-1U-N8R8', qty:1, price:4.84, dims:[18,27.5,3.3], source:'https://eu.mouser.com/en/ProductDetail/Espressif-Systems/ESP32-C5-WROOM-1U-N8R8'},
  {id:'w5500', name:'W5500 SPI Ethernet Modul', qty:1, price:9.70, dims:[28,55,18], source:'https://www.berrybase.de/w5500-spi-ethernet-modul'},
  {id:'batteryShield', name:'Dual 18650 Battery Shield V8', qty:1, price:7.44, dims:[42,98,12], source:'https://www.ebay.de/itm/202607996211'},
  {id:'batteryA', name:'Samsung INR18650-35E', qty:2, price:3.99, dims:[18.5,65.3,18.5], source:'https://geizhals.de/samsung-sdi-18650-li-ion-3500mah-inr18650-35e-a1513665.html'},
  {id:'microsd', name:'SanDisk Ultra microSDHC 32GB', qty:1, price:15.99, dims:[11,15,1], source:'https://www.mediamarkt.de/de/list/micro-sd-speicherkarte-32-gb'},
  {id:'usbC', name:'USB-C Breakout Board', qty:1, price:1.85, dims:[18,24,5], source:'https://www.berrybase.de/soldered-usb-c-buchse-breakout-board-tht-pins'},
  {id:'nav', name:'Kailh Choc V1 Navigation (5 Switches)', qty:1, price:5.90, dims:[55,55,12], source:'https://www.keebart.com/de/produkte/choc-switches'},
  {id:'caps', name:'MBK Choc Keycaps (10er-Pack)', qty:1, price:4.50, dims:[55,55,5], source:'https://www.keebart.com/de/produkte/mbk-blanks'},
  {id:'wifiAnt', name:'2.4/5.8 GHz Antenne + U.FL/SMA', qty:1, price:9.87, dims:[9,110,9], source:'https://www.henri.de/buero-pc-nb/w-lan/wlan-antennen/34518/wlan-antenne-2-4-5-8ghz-mit-sma-rev-stecker-und-pigtail-ufl-ipx-adapter-auch-fuer-bluetooth-geeignet.html'},
  {id:'btAnt', name:'Interne Dual-Band FPC-Antenne U.FL', qty:1, price:2.80, dims:[15,45,1], source:'https://www.berrybase.de/dual-band-wlan-antenne-2.4ghz-5.8ghz-u.fl-anschluss'},
  {id:'misc', name:'Kabel, Header, Schrauben, Inserts', qty:1, price:5.00, priceType:'estimate', dims:[20,20,8], source:'Schätzung'}
];

export const keyboards = [
  {id:'cardkb', name:'M5Stack CardKB v1.1', group:'Card', dims:[88,54,5], price:8.80, interface:'I²C', note:'Sehr kompakt; 50 Tasten.', source:'https://eu.robotshop.com/products/m5stack-cardkb-mini-keyboard-programmable-unit-v11-mega8a'},
  {id:'keebdeck', name:'Solder Party KeebDeck Keyboard', group:'Card', dims:[85,48,4], price:3.80, interface:'Matrix / eigene PCB', note:'69 Tasten, extrem kompakt; benötigt PCB/Dome-Sheet-Integration.', source:'https://lectronz.com/products/keebdeck-keyboard'},
  {id:'rii-x1', name:'Rii Mini X1', group:'Rii', dims:[152,59,12.5], price:18.99, interface:'2.4 GHz USB-Dongle', note:'Flachste Rii-Option, aber USB-Host/Dongle nötig.', source:'https://www.riitek.com/product/218.html'},
  {id:'rii-i10', name:'Rii Mini i10 Wireless', group:'Rii', dims:[153,63,12], price:24.99, interface:'2.4 GHz USB-Dongle', note:'Sehr flach und schmal; 70 Tasten.', source:'https://www.riitek.eu/DE/Produkte/RT-MWK10RF_DE.html'},
  {id:'rii-i4', name:'Rii Mini i4', group:'Rii', dims:[155,89,16.5], price:38.00, interface:'Bluetooth 4.0 + 2.4 GHz', note:'Bluetooth ist praktisch, aber deutlich breiter/höher.', source:'https://www.riitek.com/product/214.html'},
  {id:'rii-i8', name:'Rii Mini i8', group:'Rii', dims:[138,96,23], price:16.14, interface:'2.4 GHz USB-Dongle', note:'Kompakt, aber recht dick.', source:'https://www.riitek.com/product/220.html'},
  {id:'rii-i8plus', name:'Rii Mini i8+', group:'Rii', dims:[146,97.5,19.8], price:23.99, interface:'2.4 GHz USB-Dongle', note:'Beleuchtet; größer als i10/X1.', source:'https://www.riitek.com/product/222.html'},
  {id:'rii-x8', name:'Rii Mini X8', group:'Rii', dims:[155,89,16.5], price:21.84, interface:'2.4 GHz USB-Dongle', note:'Touchpad + Scrollrad.', source:'https://www.riitek.com/product/212.html'},
  {id:'rii-x8plus', name:'Rii Mini X8+', group:'Rii', dims:[138,96,23], price:24.99, interface:'2.4 GHz USB-Dongle', note:'X8+-Formfaktor; Preis als Näherung aus Rii-Mini-Marktbereich.', source:'https://www.riitek.com/product/216.html', priceType:'estimate'},
  {id:'rii-i8x', name:'Rii Mini i8X', group:'Rii', dims:[138,96,23], price:24.99, interface:'2.4 GHz USB-Dongle', note:'Neuere i8-Variante; Preis als Näherung.', source:'https://www.riitek.com/product/217.html', priceType:'estimate'},
  {id:'rii-i8s', name:'Rii Mini i8S', group:'Rii', dims:[138,96,23], price:24.99, interface:'2.4 GHz USB-Dongle', note:'i8-Familie; Preis als Näherung.', source:'https://www.riitek.com/product/223.html', priceType:'estimate'},
  {id:'rii-k06', name:'Rii Mini K06', group:'Rii', dims:[155,89,16.5], price:29.99, interface:'Bluetooth + 2.4 GHz', note:'Dual-Mode mit Touchpad; Herstellermaß 155 × 89 × 16,5 mm. Preis als aktueller Markt-Richtwert.', source:'https://www.riitek.com/product/257.html', priceType:'estimate'},
  {id:'rii-518bt', name:'Rii 518BT Mini Bluetooth', group:'Rii', dims:[108.5,58.2,10.2], price:39.19, interface:'Bluetooth', note:'Sehr kompakte Rii-Bluetooth-Option; ca. 108,5 × 58,2 × 10,2 mm.', source:'https://www.ebay.de/itm/397821260875'},
  {id:'rii-v3', name:'Rii Mini V3', group:'Rii', dims:[152,59,12.5], price:21.99, interface:'2.4 GHz USB-Dongle', note:'Flacher X1-ähnlicher Formfaktor; Preis als Näherung anhand aktueller K01V3-Angebote.', source:'https://www.riitek.com.cn/product/221.html', priceType:'estimate'},
  {id:'rii-rk707', name:'Rii RK707 Gamepad Keyboard', group:'Rii', dims:[141.3,92.5,27.5], price:36.99, interface:'2.4 GHz USB-Dongle', note:'Keyboard + Touchpad + Gamepad; deutlich dicker.', source:'https://www.riitek.com.cn/product/224.html'},
  {id:'rii-i12plus', name:'Rii Mini i12+', group:'Rii', dims:[262,85,14], price:27.99, interface:'2.4 GHz USB-Dongle', note:'Offiziell Mini-Serie, aber für ein echtes Handheld mit 262 mm sehr breit; Preis als Markt-Näherung.', source:'https://www.riitek.com.cn/product/219.html', priceType:'estimate'},
  {id:'bbq20', name:'BlackBerry Q20 / BBQ20 BLE+USB', group:'BlackBerry', dims:[81.95,54.97,13.3], price:43.04, interface:'BLE 5 + USB', note:'Winzig, Trackpad, sehr guter Handheld-Formfaktor.', source:'https://lectronz.com/stores/zitaotech'},
  {id:'bbq10', name:'BlackBerry Q10 / BBQ10 BLE+USB', group:'BlackBerry', dims:[76.67,53.13,12.9], price:38.41, interface:'BLE 5 + USB', note:'Noch etwas kleiner; Q10-Tastatur.', source:'https://lectronz.com/stores/zitaotech'},
  {id:'bb9900', name:'BlackBerry 9900 BLE+USB', group:'BlackBerry', dims:[74.57,56.91,13.1], price:41.15, interface:'BLE 5 + USB', note:'Smile-Layout + Trackpad.', source:'https://lectronz.com/stores/zitaotech'}
];
