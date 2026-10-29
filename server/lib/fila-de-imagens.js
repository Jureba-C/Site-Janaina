const LIMITE_DE_PIXELS = 40_000_000;
const OPCOES_DE_ENTRADA = { failOn: "error", limitInputPixels: LIMITE_DE_PIXELS };

function criarFila({ simultaneas = 2, esperando = 8 } = {}){
  let ativas = 0;
  const fila = [];

  function proxima(){
    if(ativas >= simultaneas || !fila.length) return;
    const { tarefa, resolver, rejeitar } = fila.shift();
    ativas++;
    Promise.resolve()
      .then(tarefa)
      .then(resolver, rejeitar)
      .finally(() => { ativas--; proxima(); });
  }

  function comVaga(tarefa){
    if(ativas >= simultaneas && fila.length >= esperando){
      return Promise.reject(Object.assign(new Error("Muitas fotos sendo processadas agora."), { status: 503, codigo: "fila_cheia" }));
    }
    return new Promise((resolver, rejeitar) => {
      fila.push({ tarefa, resolver, rejeitar });
      proxima();
    });
  }

  return { comVaga, estado: () => ({ ativas, esperando: fila.length }) };
}

const filaPadrao = criarFila();

module.exports = { criarFila, comVaga: filaPadrao.comVaga, estado: filaPadrao.estado, LIMITE_DE_PIXELS, OPCOES_DE_ENTRADA };
