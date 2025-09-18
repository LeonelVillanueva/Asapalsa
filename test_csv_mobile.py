import requests
import os
import pandas as pd

def create_test_csv():
    """Crea un archivo CSV de prueba"""
    
    # Crear CSV de prueba
    csv_data = {
        'FECHA': ['2024-01-01', '2024-01-02', '2024-01-03'],
        'FRUTA_RECIBIDA': [1500, 1800, 1200],
        'FRUTA_PROYECTADA': [2000, 2500, 3000],
        'PROYECCION_AJUSTADA': [2200, 1800, 2400]
    }
    
    df = pd.DataFrame(csv_data)
    df.to_csv('test_mobile.csv', sep=';', index=False, encoding='utf-8')
    
    print("✅ Archivo test_mobile.csv creado")
    print(f"📊 Columnas: {list(df.columns)}")
    print(f"📈 Filas: {len(df)}")

def test_csv_upload():
    """Prueba la carga del CSV"""
    
    if not os.path.exists('test_mobile.csv'):
        print("❌ No se encontró test_mobile.csv")
        return
    
    print("\n🧪 Probando carga de CSV...")
    
    with open('test_mobile.csv', 'rb') as f:
        files = {'file': ('test_mobile.csv', f, 'text/csv')}
        
        try:
            response = requests.post('http://localhost:5000/upload', files=files)
            print(f"📡 Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {data['success']}")
                print(f"📊 Message: {data['message']}")
                if 'info' in data:
                    print(f"📈 Info: {data['info']}")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
        finally:
            if os.path.exists('test_mobile.csv'):
                os.remove('test_mobile.csv')

if __name__ == "__main__":
    create_test_csv()
    test_csv_upload()

