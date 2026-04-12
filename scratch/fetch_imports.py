import urllib.request
import os

files = {
    "contacts": "17-sg7C_l7_zBYzIJv6ps50yl8guwLd5P",
    "products": "1pDcj-nSyMwHCPxwYS8cOCnnfuPfxDNFC"
}

def download_csv(name, file_id):
    url = f"https://docs.google.com/spreadsheets/d/{file_id}/export?format=csv"
    target = f"{name}_import.csv"
    print(f"Downloading {name} from {url}...")
    try:
        urllib.request.urlretrieve(url, target)
        print(f"Saved to {target}")
    except Exception as e:
        print(f"Error downloading {name}: {e}")

if __name__ == "__main__":
    download_csv("contacts", files["contacts"])
    download_csv("products", files["products"])
