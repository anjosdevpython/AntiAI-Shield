# AntiAI Shield 🛡️

> **Proteja suas imagens antes de publicá-las.**  
> *Defesa adversarial elegante e funcional contra o treinamento não autorizado e a personalização de modelos generativos (DreamBooth, LoRA).*

---

> Inspired by **Anti-DreamBooth: Protecting users from personalized text-to-image synthesis** — VinAI Research / ICCV 2023.  
> [Repositório VinAIResearch/Anti-DreamBooth](https://github.com/VinAIResearch/Anti-DreamBooth) • [Artigo Científico (arXiv:2303.15433)](https://arxiv.org/abs/2303.15433)

---

## 1. Visão Geral e Objetivo

O **AntiAI Shield** é uma aplicação web moderna projetada para permitir que qualquer pessoa proteja suas imagens pessoais antes de disponibilizá-las na internet.

O sistema calcula uma perturbação adversarial imperceptível aos olhos humanos, porém matematicamente otimizada para colapsar o score-matching de modelos de difusão latente (como Stable Diffusion, DreamBooth e LoRA), dificultando que fotos suas sejam utilizadas para gerar deepfakes ou recriar sua identidade digital.

### Principais Funcionalidades:
- **Upload Seguro:** Aceita PNG, JPG, JPEG e WEBP até 20 MB com validação de bytes mágicos.
- **Níveis de Proteção Configuáveis:**
  - **Equilibrado ($L_\infty \le 8/255$):** Alta preservação visual com barreira adversarial sólida.
  - **Forte ($L_\infty \le 16/255$):** Maior resistência contra processos de fine-tuning.
  - **Máxima ($L_\infty \le 24/255$):** Máxima disrupção matemática no espaço de atributos latentes.
- **Arquitetura Strategy Extensível:** Preparada para `Anti-DreamBooth`, `Anti-LoRA`, `Ensemble Multi-Modelo` e `Custom`.
- **Comparação Antes / Depois Interativa:** Slider responsivo para desktop, tablet e celular.
- **Privacidade & Remoção EXIF:** Limpeza completa de GPS, detalhes de câmera, timestamps e política de exclusão automática temporária de arquivos (`DELETE_AFTER_PROCESSING=true`).
- **Suporte Híbrido GPU/CPU:** Detecção automática de aceleração NVIDIA CUDA com fallback multi-threaded para CPU.

---

## 2. Arquitetura

O projeto adota uma separação rigorosa entre frontend e backend:

```text
projetonaouseminhaimagem/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py          # Rotas REST (/api/protect, /config, etc.)
│   │   ├── core/
│   │   │   ├── security.py           # Validação estrita de magic bytes e limites
│   │   │   └── exif.py               # Remoção atômica de metadados EXIF
│   │   ├── services/
│   │   │   └── protection_service.py # Orquestrador central e gerenciador de arquivos temporários
│   │   ├── strategies/
│   │   │   ├── base.py               # Interface abstrata ProtectionStrategy
│   │   │   ├── anti_dreambooth.py    # Otimização adversarial via PGD em PyTorch
│   │   │   ├── anti_lora.py          # Placeholder extensível
│   │   │   └── ensemble.py           # Placeholder extensível
│   │   ├── config.py                 # Configurações com Pydantic Settings
│   │   └── main.py                   # Ponto de entrada FastAPI com CORS e Lifespan
│   ├── tests/
│   │   └── test_api.py               # Testes de integração e unitários
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router (Layout e Page)
│   │   ├── components/               # Navbar, Hero, Dropzone, Settings, Slider, etc.
│   │   ├── lib/                      # Cliente de API e utilitários
│   │   └── types/                    # Definições estritas TypeScript
│   ├── tests/
│   │   └── unit.test.mjs             # Testes unitários do frontend (Node test runner)
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.mjs
└── README.md
```

---

## 3. Instalação e Execução Local

### Pré-requisitos:
- **Node.js:** Versão 18+ (testado em Node 24)
- **Python:** Versão 3.10+ (testado em Python 3.12)

---

### Executando o Backend (FastAPI + PyTorch)

1. Navegue até o diretório `backend`:
   ```bash
   cd backend
   ```

2. Crie e ative um ambiente virtual:
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```

3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```

5. Inicie a API com Uvicorn:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *A API estará disponível em `http://localhost:8000` (documentação interativa em `/docs`).*

---

### Executando o Frontend (Next.js + Tailwind CSS)

1. Em outro terminal, navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   *Acesse no seu navegador: `http://localhost:3000`.*

---

## 4. Variáveis de Ambiente

### Backend (`backend/.env`):
```env
APP_ENV=development
MAX_UPLOAD_MB=20
DELETE_AFTER_PROCESSING=true
DEFAULT_PROTECTION_LEVEL=balanced
DEVICE=auto
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
```

---

## 5. Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Status de saúde da aplicação e versão. |
| `GET` | `/api/config` | Capacidades de hardware (GPU/CPU), limites e métodos suportados. |
| `POST` | `/api/protect` | Aplica a perturbação adversarial e remove metadados EXIF. |
| `GET` | `/api/preview/{id}?type=...` | Transmite a imagem original ou protegida para o slider comparativo. |
| `GET` | `/api/download/{id}` | Baixa a imagem protegida e agenda a limpeza temporária. |
| `DELETE` | `/api/cleanup/{id}` | Descarte explícito de arquivos temporários de uma sessão. |

---

## 6. Testes

### Backend:
```powershell
backend\.venv\Scripts\pytest backend/tests
```
Testa uploads válidos, uploads inválidos (polyglots/textos falsos), métodos em desenvolvimento, cálculos de Linf e PSNR, remoção de EXIF e endpoints de download e limpeza.

### Frontend:
```bash
npm run test --prefix frontend
```
Testa validações de tipo e tamanho, cálculos geométricos do slider Before/After e formatação de dados.

---

## 7. Aviso Técnico e Limitações

> **Transparência Científica:**  
> A proteção foi projetada para dificultar determinados processos de treinamento e personalização de modelos generativos (como DreamBooth e LoRA).  
> Nenhuma técnica atual garante proteção absoluta contra todos os modelos, técnicas de treinamento ou processos agressivos de pré-processamento (como recompressão destrutiva extrema ou algoritmos pesados de denoising). A eficácia varia conforme o pipeline do invasor.

---

## 8. Créditos e Licença

- **Pesquisa Original:** Wang, S. Y., Le, T. V., et al., *Anti-DreamBooth: Protecting users from personalized text-to-image synthesis*, ICCV 2023 ([GitHub VinAIResearch](https://github.com/VinAIResearch/Anti-DreamBooth)).
- **Desenvolvido por:** Allan Anjos ([allananjos.dev.br](https://allananjos.dev.br/))
- **Licença:** MIT License.
