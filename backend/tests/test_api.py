import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.protection_service import protection_service


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def create_test_image(format="PNG", size=(64, 64), color=(100, 150, 200)):
    """Helper to generate in-memory test images."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "AntiAI Shield"


def test_config_endpoint(client):
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "device" in data
    assert "cuda_available" in data
    assert "strategies" in data
    # All strategies are now implemented
    assert any(s["id"] == "anti-dreambooth" and s["is_implemented"] for s in data["strategies"])
    assert any(s["id"] == "anti-lora" and s["is_implemented"] for s in data["strategies"])
    assert any(s["id"] == "ensemble" and s["is_implemented"] for s in data["strategies"])
    assert any(s["id"] == "custom" and s["is_implemented"] for s in data["strategies"])
    assert len(data["strength_levels"]) == 3


def test_valid_image_protection(client):
    img_bytes = create_test_image(format="PNG", size=(64, 64))
    files = {"file": ("test_avatar.png", img_bytes, "image/png")}
    data = {
        "method": "anti-dreambooth",
        "strength": "balanced",
        "remove_exif": "true",
    }

    response = client.post("/api/protect", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()

    assert "image_id" in res_json
    assert res_json["method"] == "anti-dreambooth"
    assert res_json["strength"] == "balanced"
    assert res_json["exif_removed"] is True
    assert "perturbation_norm_linf" in res_json
    assert res_json["perturbation_norm_linf"] > 0
    assert "perturbation_psnr" in res_json
    assert res_json["width"] == 64
    assert res_json["height"] == 64

    image_id = res_json["image_id"]

    # Test preview endpoints
    prev_orig = client.get(f"/api/preview/{image_id}?type=original")
    assert prev_orig.status_code == 200
    assert len(prev_orig.content) > 0

    prev_prot = client.get(f"/api/preview/{image_id}?type=protected")
    assert prev_prot.status_code == 200
    assert len(prev_prot.content) > 0

    # Test explicit cleanup
    del_res = client.delete(f"/api/cleanup/{image_id}")
    assert del_res.status_code == 200
    assert del_res.json()["cleaned"] is True


def test_anti_lora_and_ensemble_strategies(client):
    img_bytes = create_test_image(format="PNG", size=(48, 48))

    # 1. Anti-LoRA
    files_lora = {"file": ("lora_test.png", img_bytes, "image/png")}
    res_lora = client.post("/api/protect", files=files_lora, data={"method": "anti-lora", "strength": "strong"})
    assert res_lora.status_code == 200
    assert res_lora.json()["method"] == "anti-lora"
    assert res_lora.json()["perturbation_norm_linf"] > 0

    # 2. Ensemble
    files_ens = {"file": ("ens_test.png", img_bytes, "image/png")}
    res_ens = client.post("/api/protect", files=files_ens, data={"method": "ensemble", "strength": "balanced"})
    assert res_ens.status_code == 200
    assert res_ens.json()["method"] == "ensemble"

    # 3. Custom
    files_cust = {"file": ("cust_test.png", img_bytes, "image/png")}
    res_cust = client.post(
        "/api/protect",
        files=files_cust,
        data={
            "method": "custom",
            "custom_epsilon": "0.05",
            "custom_steps": "8",
            "custom_focus": "texture",
        },
    )
    assert res_cust.status_code == 200
    assert res_cust.json()["method"] == "custom"


def test_invalid_image_upload(client):
    fake_bytes = b"This is not a real image file, just plain text."
    files = {"file": ("malicious.exe", fake_bytes, "application/octet-stream")}
    response = client.post("/api/protect", files=files)
    assert response.status_code == 400
    assert "Esse arquivo não parece ser uma imagem compatível" in response.json()["detail"]


def test_unknown_method_handled_gracefully(client):
    img_bytes = create_test_image(format="JPEG", size=(48, 48))
    files = {"file": ("photo.jpg", img_bytes, "image/jpeg")}
    data = {
        "method": "unknown-nonexistent-method",
        "strength": "strong",
    }
    response = client.post("/api/protect", files=files, data=data)
    assert response.status_code == 422
    assert "desconhecido" in response.json()["detail"]


def test_exif_removal_behavior(client):
    from app.core.exif import strip_exif
    orig = Image.new("RGB", (32, 32), color=(255, 0, 0))
    orig.info["exif"] = b"ExifMockDataWithGps"
    stripped = strip_exif(orig)
    assert "exif" not in stripped.info


def test_download_and_cleanup(client):
    img_bytes = create_test_image(format="PNG", size=(48, 48))
    files = {"file": ("selfie.png", img_bytes, "image/png")}
    response = client.post("/api/protect", files=files)
    assert response.status_code == 200
    image_id = response.json()["image_id"]

    dl_response = client.get(f"/api/download/{image_id}")
    assert dl_response.status_code == 200
    assert "attachment" in dl_response.headers.get("Content-Disposition", "")
    assert len(dl_response.content) > 0
