/**
 * ROBERTITO.JS v1.0.0
 * Framework reactivo minimalista
 * Desarrollado por Roberto Miguel Costi
 * https://www.linkedin.com/in/roberto-miguel-costi-b1450292/
 */
(function() {
  'use strict';

  // Sistema de reactividad básico usando Proxy (con reactividad profunda)
  const hacerReactivo = (objeto) => {
    // Si ya es reactivo, retornar el mismo objeto
    if (objeto && objeto.__esProxy) return objeto;

    // No hacer reactivo a tipos especiales
    if (objeto instanceof Element || objeto instanceof Node || typeof objeto === 'function') {
      return objeto;
    }

    const manejadores = new Map();

    const disparar = (clave) => {
      if (manejadores.has(clave)) {
        manejadores.get(clave).forEach(fn => fn());
      }
    };

    const observar = (clave, fn) => {
      if (!manejadores.has(clave)) manejadores.set(clave, new Set());
      manejadores.get(clave).add(fn);
    };

    // Para arrays, necesitamos interceptar los métodos mutadores en el Proxy
    const esArray = Array.isArray(objeto);

    return new Proxy(objeto, {
      get(objetivo, clave) {
        if (clave === '__observar') return observar;
        if (clave === '__disparar') return disparar;
        if (clave === '__esProxy') return true;
        if (clave === '__raw') return objetivo;

        const valor = objetivo[clave];

        // Para arrays, interceptar métodos mutadores
        if (esArray) {
          const metodosArray = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
          if (metodosArray.includes(clave)) {
            return function(...args) {
              const resultado = Array.prototype[clave].apply(objetivo, args);
              // Disparar el cambio para que los observadores se ejecuten
              disparar('length');
              disparar(clave);
              return resultado;
            };
          }
          // Para otros accesos, retornar el valor tal cual
          return valor;
        }

        // Para objetos, hacer reactivos los sub-objetos
        if (valor !== null && typeof valor === 'object' && !valor.__esProxy) {
          // No hacer reactivos objetos especiales
          if (valor instanceof Element || valor instanceof Node || typeof valor === 'function') {
            return valor;
          }

          // TAMBIÉN hacer reactivos los arrays para que tengan observadores
          objetivo[clave] = hacerReactivo(valor);
          return objetivo[clave];
        }

        return valor;
      },
      set(objetivo, clave, valor) {
        const valorAnterior = objetivo[clave];

        // Si el nuevo valor es un objeto (pero NO un array), hacerlo reactivo
        if (valor !== null && typeof valor === 'object' && !valor.__esProxy && !Array.isArray(valor)) {
          if (!(valor instanceof Element) && !(valor instanceof Node) && typeof valor !== 'function') {
            valor = hacerReactivo(valor);
          }
        }

        objetivo[clave] = valor;

        if (valorAnterior !== valor) {
          disparar(clave);
        }
        return true;
      }
    });
  };

  // Cola para actualizaciones del DOM
  let colaActualizacion = new Set();
  let ejecutandoCola = false;

  const encolarActualizacion = (fn) => {
    colaActualizacion.add(fn);
    if (!ejecutandoCola) {
      ejecutandoCola = true;
      Promise.resolve().then(() => {
        const cola = Array.from(colaActualizacion);
        colaActualizacion.clear();
        ejecutandoCola = false;
        cola.forEach(fn => {
          try {
            fn();
          } catch(e) {
            console.error('Error en actualización encolada:', e);
          }
        });
      });
    }
  };

  // Contexto de evaluación
  const evaluar = (elemento, expresion, alcance = {}) => {
    try {
      const funcion = new Function('$datos', '$elemento', '$siguienteCiclo', `with($datos) { return ${expresion} }`);
      return funcion(alcance, elemento, siguienteCiclo);
    } catch (e) {
      // Solo mostrar error si NO es un error de null/undefined
      if (!(e instanceof TypeError && (e.message.includes('Cannot read properties of null') || e.message.includes('Cannot read properties of undefined')))) {
        console.error(`Error evaluando: ${expresion}`, e);
      }
      return undefined;
    }
  };

  const evaluarSentencia = (elemento, expresion, alcance = {}) => {
    try {
      const funcion = new Function('$datos', '$elemento', '$siguienteCiclo', `with($datos) { ${expresion} }`);
      return funcion(alcance, elemento, siguienteCiclo);
    } catch (e) {
      console.error(`Error evaluando sentencia: ${expresion}`, e);
    }
  };

  // Utilidades
  const siguienteCiclo = (callback) => {
    return new Promise(resolve => {
      encolarActualizacion(() => {
        callback && callback();
        resolve();
      });
    });
  };

  // Store global para componentes procesados
  const elementosProcesados = new WeakMap();

  // Procesador de directivas
  class ProcesadorDirectivas {
    constructor(elemento, alcance) {
      this.elemento = elemento;
      this.alcance = alcance;
      this.limpiezas = [];
      this.observadores = new Set();
    }

    // r-datos
    procesarDatos(expresion) {
      let datos;

      if (expresion.trim() === '') {
        datos = {};
      } else {
        // Evaluar la expresión en el contexto del alcance padre
        datos = evaluar(this.elemento, expresion, this.alcance);
      }

      if (typeof datos === 'object' && datos !== null) {
        // NO crear un nuevo proxy, usar el objeto tal cual
        // Si ya es reactivo (proxy), usarlo directamente
        // Si no es reactivo, convertirlo
        if (!datos.__esProxy) {
          this.alcance = hacerReactivo(datos);
        } else {
          this.alcance = datos;
        }

        // Agregar propiedades mágicas al alcance
        if (!this.alcance.$siguienteCiclo) {
          this.alcance.$siguienteCiclo = siguienteCiclo;
        }
        if (!this.alcance.$elemento) {
          this.alcance.$elemento = this.elemento;
        }

        // Guardar referencia en el elemento
        this.elemento._r_alcanceDatos = this.alcance;

        // NO ejecutar init aquí, se ejecutará después
      } else if (datos === undefined && this.alcance) {
        // Si datos es undefined, mantener el alcance padre
        // Esto permite que los elementos sin r-datos hereden el alcance
        // No hacemos nada, this.alcance ya tiene el alcance padre
        return this.alcance;
      }

      return this.alcance;
    }

    // r-inicio
    procesarInicio(expresion) {
      const resultado = evaluarSentencia(this.elemento, expresion, this.alcance);

      // Si retorna una promesa, esperarla y luego procesar los hijos
      if (resultado && typeof resultado.then === 'function') {
        resultado.then(() => {
          // Después de que termine el init async, procesar los hijos
          encolarActualizacion(() => {
            // Limpiar el WeakMap para los hijos para que puedan ser reprocesados
            const limpiarProcesados = (elemento) => {
              elementosProcesados.delete(elemento);
              Array.from(elemento.children).forEach(hijo => limpiarProcesados(hijo));
            };

            Array.from(this.elemento.children).forEach(hijo => {
              limpiarProcesados(hijo);
              procesarElemento(hijo, this.alcance);
            });
          });
        }).catch(e => {
          console.error('Error en r-inicio asíncrono:', e);
        });

        return resultado;
      }

      return null;
    }

    // r-efecto
    procesarEfecto(expresion) {
      const ejecutarEfecto = () => {
        evaluarSentencia(this.elemento, expresion, this.alcance);
      };

      // Ejecutar inmediatamente
      encolarActualizacion(ejecutarEfecto);

      // Observar cambios en el alcance
      if (this.alcance && this.alcance.__observar) {
        Object.keys(this.alcance).forEach(clave => {
          if (!clave.startsWith('__') && !clave.startsWith('_r_')) {
            this.alcance.__observar(clave, ejecutarEfecto);
            this.observadores.add(() => {}); // Track que tenemos observadores
          }
        });
      }
    }

    // r-mostrar
    procesarMostrar(expresion) {
      const actualizar = () => {
        const mostrar = evaluar(this.elemento, expresion, this.alcance);
        this.elemento.style.display = mostrar ? '' : 'none';
      };

      actualizar();

      if (this.alcance && this.alcance.__observar) {
        this.observarExpresion(expresion, actualizar);
      }
    }

    // r-texto
    procesarTexto(expresion) {
      const actualizar = () => {
        const texto = evaluar(this.elemento, expresion, this.alcance);
        this.elemento.textContent = texto ?? '';
      };

      actualizar();

      if (this.alcance && this.alcance.__observar) {
        this.observarExpresion(expresion, actualizar);
      }
    }

    // r-modelo
    procesarModelo(expresion) {
      const actualizar = () => {
        const valor = evaluar(this.elemento, expresion, this.alcance);

        if (this.elemento.type === 'checkbox') {
          this.elemento.checked = !!valor;
        } else if (this.elemento.type === 'radio') {
          this.elemento.checked = this.elemento.value === valor;
        } else {
          this.elemento.value = valor ?? '';
        }
      };

      actualizar();

      // Listener para cambios del usuario
      const manejador = (e) => {
        let valor;
        if (this.elemento.type === 'checkbox') {
          valor = this.elemento.checked;
        } else if (this.elemento.type === 'number') {
          valor = this.elemento.valueAsNumber;
        } else {
          valor = this.elemento.value;
        }

        // Actualizar el alcance usando ruta
        this.establecerValorPorRuta(this.alcance, expresion, valor);
      };

      this.elemento.addEventListener('input', manejador);
      this.limpiezas.push(() => this.elemento.removeEventListener('input', manejador));

      if (this.alcance && this.alcance.__observar) {
        this.observarExpresion(expresion, actualizar);
      }
    }

    // Helper para setear valores por ruta (ej: "configuracion.pasos")
    establecerValorPorRuta(objeto, ruta, valor) {
      const claves = ruta.split('.');
      let actual = objeto;

      for (let i = 0; i < claves.length - 1; i++) {
        if (!actual[claves[i]]) {
          actual[claves[i]] = {};
        }
        actual = actual[claves[i]];
      }

      actual[claves[claves.length - 1]] = valor;
    }

    // r-enlace / :
    procesarEnlace(atributo, expresion) {
      const actualizar = () => {
        const valor = evaluar(this.elemento, expresion, this.alcance);

        if (atributo === 'class') {
          // Manejar enlace de clase
          if (typeof valor === 'string') {
            this.elemento.className = valor;
          } else if (typeof valor === 'object') {
            Object.keys(valor).forEach(clase => {
              if (valor[clase]) {
                this.elemento.classList.add(clase);
              } else {
                this.elemento.classList.remove(clase);
              }
            });
          }
        } else if (atributo === 'style') {
          // Manejar enlace de estilo
          if (typeof valor === 'string') {
            this.elemento.setAttribute('style', valor);
          } else if (typeof valor === 'object') {
            Object.assign(this.elemento.style, valor);
          }
        } else if (atributo === 'disabled' || atributo === 'checked' || atributo === 'selected') {
          // Atributos booleanos
          if (valor) {
            this.elemento.setAttribute(atributo, '');
            if (atributo === 'disabled') this.elemento.disabled = true;
            if (atributo === 'checked') this.elemento.checked = true;
            if (atributo === 'selected') this.elemento.selected = true;
          } else {
            this.elemento.removeAttribute(atributo);
            if (atributo === 'disabled') this.elemento.disabled = false;
            if (atributo === 'checked') this.elemento.checked = false;
            if (atributo === 'selected') this.elemento.selected = false;
          }
        } else {
          // Atributos regulares
          if (valor === null || valor === undefined || valor === false) {
            this.elemento.removeAttribute(atributo);
          } else {
            this.elemento.setAttribute(atributo, valor);
          }
        }
      };

      actualizar();

      if (this.alcance && this.alcance.__observar) {
        this.observarExpresion(expresion, actualizar);
      }
    }

    // r-evento / @
    procesarEvento(evento, expresion, modificadores = []) {
      const manejador = (e) => {
        // Modificadores de teclado
        if (modificadores.includes('enter') && e.key !== 'Enter') return;
        if (modificadores.includes('escape') && e.key !== 'Escape') return;
        if (modificadores.includes('space') && e.key !== ' ') return;
        if (modificadores.includes('tab') && e.key !== 'Tab') return;

        // Modificadores de comportamiento
        if (modificadores.includes('prevenir')) {
          e.preventDefault();
        }
        if (modificadores.includes('detener')) {
          e.stopPropagation();
        }

        evaluarSentencia(this.elemento, expresion, this.alcance);
      };

      this.elemento.addEventListener(evento, manejador);
      this.limpiezas.push(() => this.elemento.removeEventListener(evento, manejador));
    }

    // r-para
    procesarPara(plantilla, expresion) {
      // Parsear expresión: "item in items" o "(item, indice) in items"
      const coincidencia = expresion.match(/^(.+?)\s+en\s+(.+)$/);
      if (!coincidencia) {
        console.error('Expresión r-para inválida:', expresion);
        return;
      }

      let nombreItem = coincidencia[1].trim();
      let nombreIndice = null;
      const expresionArray = coincidencia[2].trim();

      // Detectar sintaxis (item, indice)
      if (nombreItem.startsWith('(') && nombreItem.endsWith(')')) {
        const partes = nombreItem.slice(1, -1).split(',').map(p => p.trim());
        nombreItem = partes[0];
        nombreIndice = partes[1] || 'indice';
      }

      const padre = plantilla.parentElement;
      const comentario = document.createComment('r-para');
      padre.insertBefore(comentario, plantilla);
      plantilla.remove();

      let elementosRenderizados = [];

      const actualizar = () => {
        const array = evaluar(plantilla, expresionArray, this.alcance);

        // Pausar el observador para evitar procesamiento duplicado
        pausarObservador();

        // Limpiar elementos anteriores
        elementosRenderizados.forEach(item => {
          if (item.elemento && item.elemento.parentNode) {
            item.elemento.remove();
          }
        });
        elementosRenderizados = [];

        if (!Array.isArray(array)) {
          reanudarObservador();
          return;
        }

        // Renderizar nuevos elementos
        for (let indice = 0; indice < array.length; indice++) {
          const item = array[indice];
          const clon = plantilla.content.cloneNode(true);
          const primerElemento = clon.firstElementChild;

          if (primerElemento) {
            // Crear alcance para este item
            const alcanceItem = Object.create(this.alcance);

            // Definir propiedades propias para item
            Object.defineProperty(alcanceItem, nombreItem, {
              value: item,
              writable: true,
              enumerable: true,
              configurable: true
            });

            // Definir índice con el nombre correcto
            const nombreIndiceFinal = nombreIndice || 'indice';
            Object.defineProperty(alcanceItem, nombreIndiceFinal, {
              value: indice,
              writable: true,
              enumerable: true,
              configurable: true
            });

            // Procesar el elemento clonado
            procesarElemento(primerElemento, alcanceItem);

            // Insertar en el DOM
            padre.insertBefore(primerElemento, comentario);
            elementosRenderizados.push({ elemento: primerElemento, alcance: alcanceItem });
          }
        }

        // Resumir el observador después de un pequeño delay
        setTimeout(() => reanudarObservador(), 10);
      };

      // Ejecutar actualización inicial
      actualizar();

      // Configurar observador solo una vez
      if (this.alcance && this.alcance.__observar && !plantilla._r_paraObservadorConfigurado) {
        plantilla._r_paraObservadorConfigurado = true;
        this.observarExpresion(expresionArray, actualizar);
      }
    }

    // Helper para observar expresiones
    observarExpresion(expresion, callback) {
      if (!this.alcance || !this.alcance.__observar) return;

      // Extraer variables de la expresión
      const variables = expresion.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
      const variablesUnicas = [...new Set(variables)];

      variablesUnicas.forEach(v => {
        const variableRaiz = v.split('.')[0];
        if (this.alcance[variableRaiz] !== undefined &&
            !variableRaiz.startsWith('$') &&
            !variableRaiz.startsWith('_')) {
          this.alcance.__observar(variableRaiz, callback);

          // Para arrays reactivos, también observar 'length' y métodos mutadores
          const valorArray = this.alcance[variableRaiz];
          if (Array.isArray(valorArray) && valorArray.__observar) {
            valorArray.__observar('length', callback);
            valorArray.__observar('unshift', callback);
            valorArray.__observar('push', callback);
            valorArray.__observar('pop', callback);
            valorArray.__observar('shift', callback);
            valorArray.__observar('splice', callback);
          }

          this.observadores.add(callback);
        }
      });
    }

    limpiar() {
      this.limpiezas.forEach(fn => fn());
      this.limpiezas = [];
      this.observadores.clear();
    }
  }

  // Procesar un elemento y sus directivas
  const procesarElemento = (elemento, alcancePadre = null) => {
    if (!elemento || elemento.nodeType !== 1) return;

    // Verificar si ya fue procesado
    if (elementosProcesados.has(elemento)) {
      // Si es un template con r-para, NUNCA reprocesar
      if (elemento.tagName === 'TEMPLATE' && elemento.hasAttribute('r-para')) {
        return;
      }
      return;
    }
    elementosProcesados.set(elemento, true);

    const procesador = new ProcesadorDirectivas(elemento, alcancePadre);
    let alcanceActual = alcancePadre;

    // Obtener alcance del elemento padre si existe
    if (!alcanceActual && elemento.parentElement) {
      let padre = elemento.parentElement;
      while (padre && !alcanceActual) {
        alcanceActual = padre._r_alcanceDatos;
        padre = padre.parentElement;
      }
    }

    procesador.alcance = alcanceActual;

    // Procesar r-datos primero
    let tieneInicio = false;
    if (elemento.hasAttribute('r-datos')) {
      const expresion = elemento.getAttribute('r-datos');
      alcanceActual = procesador.procesarDatos(expresion);
      procesador.alcance = alcanceActual;

      // Si hay r-inicio, ejecutarlo ANTES de procesar hijos
      if (elemento.hasAttribute('r-inicio')) {
        tieneInicio = true;
        const resultado = procesador.procesarInicio(elemento.getAttribute('r-inicio'));

        // Si el inicio retorna una promesa (async), los hijos se procesarán después
        if (resultado && typeof resultado.then === 'function') {
          // No procesar hijos aquí, se procesarán cuando termine el async init
          return;
        }
      }
    } else if (elemento.hasAttribute('r-inicio')) {
      // Si no hay r-datos pero sí r-inicio
      tieneInicio = true;
      procesador.procesarInicio(elemento.getAttribute('r-inicio'));
    }

    // Procesar r-para en templates (antes de otros atributos)
    if (elemento.tagName === 'TEMPLATE' && elemento.hasAttribute('r-para')) {
      // Marcar como procesado ANTES de procesarlo para evitar loops infinitos
      const expresionPara = elemento.getAttribute('r-para');

      // Verificar si este template ya tiene un procesador activo
      if (!elemento._r_paraProcesado) {
        elemento._r_paraProcesado = true;
        procesador.procesarPara(elemento, expresionPara);
      }

      return; // No procesar hijos del template
    }

    // Procesar r-efecto
    if (elemento.hasAttribute('r-efecto')) {
      procesador.procesarEfecto(elemento.getAttribute('r-efecto'));
    }

    // Procesar r-mostrar
    if (elemento.hasAttribute('r-mostrar')) {
      procesador.procesarMostrar(elemento.getAttribute('r-mostrar'));
    }

    // Procesar r-texto
    if (elemento.hasAttribute('r-texto')) {
      procesador.procesarTexto(elemento.getAttribute('r-texto'));
    }

    // Procesar r-modelo
    if (elemento.hasAttribute('r-modelo')) {
      procesador.procesarModelo(elemento.getAttribute('r-modelo'));
    }

    // Procesar r-enlace y : shorthand
    Array.from(elemento.attributes).forEach(atributo => {
      if (atributo.name.startsWith('r-enlace:')) {
        const nombreAtributo = atributo.name.substring(9);
        procesador.procesarEnlace(nombreAtributo, atributo.value);
      } else if (atributo.name.startsWith(':') && atributo.name !== ':clave') {
        const nombreAtributo = atributo.name.substring(1);
        procesador.procesarEnlace(nombreAtributo, atributo.value);
      }
    });

    // Procesar r-evento y @ shorthand
    Array.from(elemento.attributes).forEach(atributo => {
      if (atributo.name.startsWith('r-evento:')) {
        const partes = atributo.name.substring(9).split('.');
        const evento = partes[0];
        const modificadores = partes.slice(1);
        procesador.procesarEvento(evento, atributo.value, modificadores);
      } else if (atributo.name.startsWith('@')) {
        const partes = atributo.name.substring(1).split('.');
        const evento = partes[0];
        const modificadores = partes.slice(1);
        procesador.procesarEvento(evento, atributo.value, modificadores);
      }
    });

    // Procesar hijos recursivamente
    Array.from(elemento.children).forEach(hijo => {
      procesarElemento(hijo, alcanceActual);
    });
  };

  // Observador para detectar cambios dinámicos en el DOM
  let observador = null;
  let observadorPausado = false;

  const pausarObservador = () => {
    observadorPausado = true;
  };

  const reanudarObservador = () => {
    observadorPausado = false;
  };

  const iniciarObservador = () => {
    if (observador) return;

    observador = new MutationObserver((mutaciones) => {
      if (observadorPausado) return;

      mutaciones.forEach((mutacion) => {
        // Procesar nodos agregados
        mutacion.addedNodes.forEach((nodo) => {
          if (nodo.nodeType === 1) {
            // Procesar el nodo y sus descendientes
            recorrerDOM(nodo, (elemento) => {
              if (elemento.hasAttribute && (
                elemento.hasAttribute('r-datos') ||
                elemento.hasAttribute('r-inicio') ||
                elemento.hasAttribute('r-mostrar') ||
                elemento.hasAttribute('r-texto') ||
                elemento.hasAttribute('r-modelo') ||
                elemento.hasAttribute('r-para') ||
                Array.from(elemento.attributes).some(a =>
                  a.name.startsWith('r-') ||
                  a.name.startsWith(':') ||
                  a.name.startsWith('@')
                )
              )) {
                procesarElemento(elemento);
              }
            });
          }
        });
      });
    });

    observador.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  };

  // Helper para recorrer el DOM
  const recorrerDOM = (elemento, callback) => {
    if (!elemento || elemento.nodeType !== 1) return;

    callback(elemento);

    Array.from(elemento.children).forEach(hijo => {
      recorrerDOM(hijo, callback);
    });
  };

  // Inicializar
  const iniciar = () => {
    // Procesar todos los elementos con directivas r-
    document.querySelectorAll('[r-datos]').forEach(elemento => {
      procesarElemento(elemento);
    });

    // Iniciar observador para detectar elementos agregados dinámicamente
    iniciarObservador();
  };

  // API pública
  window.Robertito = {
    iniciar: iniciar,
    version: '1.0.0',
    procesarElemento: procesarElemento,
  };

  // Auto-iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

})();
