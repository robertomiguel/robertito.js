/**
 * ROBERTITO.JS v1.0.0
 * Framework reactivo minimalista
 * Desarrollado por Roberto Miguel Costi
 * https://www.linkedin.com/in/roberto-miguel-costi-b1450292/
 */
(function() {
  'use strict';

  // Sistema de reactividad básico usando Proxy (con reactividad profunda)
  const makeReactive = (obj) => {
    // Si ya es reactivo, retornar el mismo objeto
    if (obj && obj.__isProxy) return obj;

    // No hacer reactivo a tipos especiales
    if (obj instanceof Element || obj instanceof Node || typeof obj === 'function') {
      return obj;
    }

    const handlers = new Map();

    const trigger = (key) => {
      if (handlers.has(key)) {
        handlers.get(key).forEach(fn => fn());
      }
    };

    const observe = (key, fn) => {
      if (!handlers.has(key)) handlers.set(key, new Set());
      handlers.get(key).add(fn);
    };

    // Para arrays, necesitamos interceptar los métodos mutadores en el Proxy
    const isArray = Array.isArray(obj);

    return new Proxy(obj, {
      get(target, key) {
        if (key === '__observe') return observe;
        if (key === '__trigger') return trigger;
        if (key === '__isProxy') return true;
        if (key === '__raw') return target;

        const value = target[key];

        // Para arrays, interceptar métodos mutadores
        if (isArray) {
          const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
          if (arrayMethods.includes(key)) {
            return function(...args) {
              const result = Array.prototype[key].apply(target, args);
              // Disparar el cambio para que los observadores se ejecuten
              trigger('length');
              trigger(key);
              return result;
            };
          }
          // Para otros accesos, retornar el valor tal cual
          return value;
        }

        // Para objetos, hacer reactivos los sub-objetos
        if (value !== null && typeof value === 'object' && !value.__isProxy) {
          // No hacer reactivos objetos especiales
          if (value instanceof Element || value instanceof Node || typeof value === 'function') {
            return value;
          }

          // TAMBIÉN hacer reactivos los arrays para que tengan observadores
          target[key] = makeReactive(value);
          return target[key];
        }

        return value;
      },
      set(target, key, value) {
        const oldValue = target[key];

        // Si el nuevo valor es un objeto (pero NO un array), hacerlo reactivo
        if (value !== null && typeof value === 'object' && !value.__isProxy && !Array.isArray(value)) {
          if (!(value instanceof Element) && !(value instanceof Node) && typeof value !== 'function') {
            value = makeReactive(value);
          }
        }

        target[key] = value;

        if (oldValue !== value) {
          trigger(key);
        }
        return true;
      }
    });
  };

  // Cola para actualizaciones del DOM
  let updateQueue = new Set();
  let isFlushing = false;

  const queueUpdate = (fn) => {
    updateQueue.add(fn);
    if (!isFlushing) {
      isFlushing = true;
      Promise.resolve().then(() => {
        const queue = Array.from(updateQueue);
        updateQueue.clear();
        isFlushing = false;
        queue.forEach(fn => {
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
  const evaluate = (element, expression, scope = {}) => {
    try {
      const fn = new Function('$data', '$element', '$nextTick', `with($data) { return ${expression} }`);
      return fn(scope, element, nextTick);
    } catch (e) {
      // Solo mostrar error si NO es un error de null/undefined
      if (!(e instanceof TypeError && (e.message.includes('Cannot read properties of null') || e.message.includes('Cannot read properties of undefined')))) {
        console.error(`Error evaluando: ${expression}`, e);
      }
      return undefined;
    }
  };

  const evaluateStatement = (element, expression, scope = {}) => {
    try {
      const fn = new Function('$data', '$element', '$nextTick', `with($data) { ${expression} }`);
      return fn(scope, element, nextTick);
    } catch (e) {
      console.error(`Error evaluando sentencia: ${expression}`, e);
    }
  };

  // Utilidades
  const nextTick = (callback) => {
    return new Promise(resolve => {
      queueUpdate(() => {
        callback && callback();
        resolve();
      });
    });
  };

  // Store global para componentes procesados
  const processedElements = new WeakMap();

  // Procesador de directivas
  class DirectiveProcessor {
    constructor(element, scope) {
      this.element = element;
      this.scope = scope;
      this.cleanups = [];
      this.observers = new Set();
    }

    // r-data
    processData(expression) {
      let data;

      if (expression.trim() === '') {
        data = {};
      } else {
        // Evaluar la expresión en el contexto del alcance padre
        data = evaluate(this.element, expression, this.scope);
      }

      if (typeof data === 'object' && data !== null) {
        // NO crear un nuevo proxy, usar el objeto tal cual
        // Si ya es reactivo (proxy), usarlo directamente
        // Si no es reactivo, convertirlo
        if (!data.__isProxy) {
          this.scope = makeReactive(data);
        } else {
          this.scope = data;
        }

        // Agregar propiedades mágicas al alcance
        if (!this.scope.$nextTick) {
          this.scope.$nextTick = nextTick;
        }
        if (!this.scope.$element) {
          this.scope.$element = this.element;
        }

        // Guardar referencia en el elemento
        this.element._r_scopeData = this.scope;

        // NO ejecutar init aquí, se ejecutará después
      } else if (data === undefined && this.scope) {
        // Si datos es undefined, mantener el alcance padre
        // Esto permite que los elementos sin r-datos hereden el alcance
        // No hacemos nada, this.scope ya tiene el alcance padre
        return this.scope;
      }

      return this.scope;
    }

    // r-init
    processInit(expression) {
      const result = evaluateStatement(this.element, expression, this.scope);

      // Si retorna una promesa, esperarla y luego procesar los hijos
      if (result && typeof result.then === 'function') {
        result.then(() => {
          // Después de que termine el init async, procesar los hijos
          queueUpdate(() => {
            // Limpiar el WeakMap para los hijos para que puedan ser reprocesados
            const clearProcessed = (element) => {
              processedElements.delete(element);
              Array.from(element.children).forEach(child => clearProcessed(child));
            };

            Array.from(this.element.children).forEach(child => {
              clearProcessed(child);
              processElement(child, this.scope);
            });
          });
        }).catch(e => {
          console.error('Error en r-init asíncrono:', e);
        });

        return result;
      }

      return null;
    }

    // r-effect
    processEffect(expression) {
      const runEffect = () => {
        evaluateStatement(this.element, expression, this.scope);
      };

      // Ejecutar inmediatamente
      queueUpdate(runEffect);

      // Observar cambios en el alcance
      if (this.scope && this.scope.__observe) {
        Object.keys(this.scope).forEach(key => {
          if (!key.startsWith('__') && !key.startsWith('_r_')) {
            this.scope.__observe(key, runEffect);
            this.observers.add(() => {}); // Track que tenemos observadores
          }
        });
      }
    }

    // r-show
    processShow(expression) {
      const update = () => {
        const show = evaluate(this.element, expression, this.scope);
        this.element.style.display = show ? '' : 'none';
      };

      update();

      if (this.scope && this.scope.__observe) {
        this.observeExpression(expression, update);
      }
    }

    // r-text
    processText(expression) {
      const update = () => {
        const text = evaluate(this.element, expression, this.scope);
        this.element.textContent = text ?? '';
      };

      update();

      if (this.scope && this.scope.__observe) {
        this.observeExpression(expression, update);
      }
    }

    // r-model
    processModel(expression) {
      const update = () => {
        const value = evaluate(this.element, expression, this.scope);

        if (this.element.type === 'checkbox') {
          this.element.checked = !!value;
        } else if (this.element.type === 'radio') {
          this.element.checked = this.element.value === value;
        } else {
          this.element.value = value ?? '';
        }
      };

      update();

      // Listener para cambios del usuario
      const handler = (e) => {
        let value;
        if (this.element.type === 'checkbox') {
          value = this.element.checked;
        } else if (this.element.type === 'number') {
          value = this.element.valueAsNumber;
        } else {
          value = this.element.value;
        }

        // Actualizar el alcance usando ruta
        this.setValueByPath(this.scope, expression, value);
      };

      this.element.addEventListener('input', handler);
      this.cleanups.push(() => this.element.removeEventListener('input', handler));

      if (this.scope && this.scope.__observe) {
        this.observeExpression(expression, update);
      }
    }

    // Helper para setear valores por ruta (ej: "configuracion.pasos")
    setValueByPath(obj, path, value) {
      const keys = path.split('.');
      let current = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
    }

    // r-bind / :
    processBind(attribute, expression) {
      const update = () => {
        const value = evaluate(this.element, expression, this.scope);

        if (attribute === 'class') {
          // Manejar enlace de clase
          if (typeof value === 'string') {
            this.element.className = value;
          } else if (typeof value === 'object') {
            Object.keys(value).forEach(className => {
              if (value[className]) {
                this.element.classList.add(className);
              } else {
                this.element.classList.remove(className);
              }
            });
          }
        } else if (attribute === 'style') {
          // Manejar enlace de estilo
          if (typeof value === 'string') {
            this.element.setAttribute('style', value);
          } else if (typeof value === 'object') {
            Object.assign(this.element.style, value);
          }
        } else if (attribute === 'disabled' || attribute === 'checked' || attribute === 'selected') {
          // Atributos booleanos
          if (value) {
            this.element.setAttribute(attribute, '');
            if (attribute === 'disabled') this.element.disabled = true;
            if (attribute === 'checked') this.element.checked = true;
            if (attribute === 'selected') this.element.selected = true;
          } else {
            this.element.removeAttribute(attribute);
            if (attribute === 'disabled') this.element.disabled = false;
            if (attribute === 'checked') this.element.checked = false;
            if (attribute === 'selected') this.element.selected = false;
          }
        } else {
          // Atributos regulares
          if (value === null || value === undefined || value === false) {
            this.element.removeAttribute(attribute);
          } else {
            this.element.setAttribute(attribute, value);
          }
        }
      };

      update();

      if (this.scope && this.scope.__observe) {
        this.observeExpression(expression, update);
      }
    }

    // r-on / @
    processEvent(event, expression, modifiers = []) {
      const handler = (e) => {
        // Modificadores de teclado
        if (modifiers.includes('enter') && e.key !== 'Enter') return;
        if (modifiers.includes('escape') && e.key !== 'Escape') return;
        if (modifiers.includes('space') && e.key !== ' ') return;
        if (modifiers.includes('tab') && e.key !== 'Tab') return;

        // Modificadores de comportamiento
        if (modifiers.includes('prevent')) {
          e.preventDefault();
        }
        if (modifiers.includes('stop')) {
          e.stopPropagation();
        }

        evaluateStatement(this.element, expression, this.scope);
      };

      this.element.addEventListener(event, handler);
      this.cleanups.push(() => this.element.removeEventListener(event, handler));
    }

    // r-for
    processFor(template, expression) {
      // Parsear expresión: "item in items" o "(item, index) in items"
      const match = expression.match(/^(.+?)\s+in\s+(.+)$/);
      if (!match) {
        console.error('Expresión r-for inválida:', expression);
        return;
      }

      let itemName = match[1].trim();
      let indexName = null;
      const arrayExpression = match[2].trim();

      // Detectar sintaxis (item, index)
      if (itemName.startsWith('(') && itemName.endsWith(')')) {
        const parts = itemName.slice(1, -1).split(',').map(p => p.trim());
        itemName = parts[0];
        indexName = parts[1] || 'index';
      }

      const parent = template.parentElement;
      const comment = document.createComment('r-for');
      parent.insertBefore(comment, template);
      template.remove();

      let renderedElements = [];

      const update = () => {
        const array = evaluate(template, arrayExpression, this.scope);

        // Pausar el observador para evitar procesamiento duplicado
        pauseObserver();

        // Limpiar elementos anteriores
        renderedElements.forEach(item => {
          if (item.element && item.element.parentNode) {
            item.element.remove();
          }
        });
        renderedElements = [];

        if (!Array.isArray(array)) {
          resumeObserver();
          return;
        }

        // Renderizar nuevos elementos
        for (let index = 0; index < array.length; index++) {
          const item = array[index];
          const clone = template.content.cloneNode(true);
          const firstElement = clone.firstElementChild;

          if (firstElement) {
            // Crear alcance para este item
            const itemScope = Object.create(this.scope);

            // Definir propiedades propias para item
            Object.defineProperty(itemScope, itemName, {
              value: item,
              writable: true,
              enumerable: true,
              configurable: true
            });

            // Definir índice con el nombre correcto
            const finalIndexName = indexName || 'index';
            Object.defineProperty(itemScope, finalIndexName, {
              value: index,
              writable: true,
              enumerable: true,
              configurable: true
            });

            // Procesar el elemento clonado
            processElement(firstElement, itemScope);

            // Insertar en el DOM
            parent.insertBefore(firstElement, comment);
            renderedElements.push({ element: firstElement, scope: itemScope });
          }
        }

        // Resumir el observador después de un pequeño delay
        setTimeout(() => resumeObserver(), 10);
      };

      // Ejecutar actualización inicial
      update();

      // Configurar observador solo una vez
      if (this.scope && this.scope.__observe && !template._r_forObserverConfigured) {
        template._r_forObserverConfigured = true;
        this.observeExpression(arrayExpression, update);
      }
    }

    // Helper para observar expresiones
    observeExpression(expression, callback) {
      if (!this.scope || !this.scope.__observe) return;

      // Extraer variables de la expresión
      const variables = expression.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
      const uniqueVariables = [...new Set(variables)];

      uniqueVariables.forEach(v => {
        const rootVariable = v.split('.')[0];
        if (this.scope[rootVariable] !== undefined &&
            !rootVariable.startsWith('$') &&
            !rootVariable.startsWith('_')) {
          this.scope.__observe(rootVariable, callback);

          // Para arrays reactivos, también observar 'length' y métodos mutadores
          const arrayValue = this.scope[rootVariable];
          if (Array.isArray(arrayValue) && arrayValue.__observe) {
            arrayValue.__observe('length', callback);
            arrayValue.__observe('unshift', callback);
            arrayValue.__observe('push', callback);
            arrayValue.__observe('pop', callback);
            arrayValue.__observe('shift', callback);
            arrayValue.__observe('splice', callback);
          }

          this.observers.add(callback);
        }
      });
    }

    cleanup() {
      this.cleanups.forEach(fn => fn());
      this.cleanups = [];
      this.observers.clear();
    }
  }

  // Procesar un elemento y sus directivas
  const processElement = (element, parentScope = null) => {
    if (!element || element.nodeType !== 1) return;

    // Verificar si ya fue procesado
    if (processedElements.has(element)) {
      // Si es un template con r-for, NUNCA reprocesar
      if (element.tagName === 'TEMPLATE' && element.hasAttribute('r-for')) {
        return;
      }
      return;
    }
    processedElements.set(element, true);

    const processor = new DirectiveProcessor(element, parentScope);
    let currentScope = parentScope;

    // Obtener alcance del elemento padre si existe
    if (!currentScope && element.parentElement) {
      let parent = element.parentElement;
      while (parent && !currentScope) {
        currentScope = parent._r_scopeData;
        parent = parent.parentElement;
      }
    }

    processor.scope = currentScope;

    // Procesar r-data primero
    let hasInit = false;
    if (element.hasAttribute('r-data')) {
      const expression = element.getAttribute('r-data');
      currentScope = processor.processData(expression);
      processor.scope = currentScope;

      // Si hay r-init, ejecutarlo ANTES de procesar hijos
      if (element.hasAttribute('r-init')) {
        hasInit = true;
        const result = processor.processInit(element.getAttribute('r-init'));

        // Si el inicio retorna una promesa (async), los hijos se procesarán después
        if (result && typeof result.then === 'function') {
          // No procesar hijos aquí, se procesarán cuando termine el async init
          return;
        }
      }
    } else if (element.hasAttribute('r-init')) {
      // Si no hay r-data pero sí r-init
      hasInit = true;
      processor.processInit(element.getAttribute('r-init'));
    }

    // Procesar r-for en templates (antes de otros atributos)
    if (element.tagName === 'TEMPLATE' && element.hasAttribute('r-for')) {
      // Marcar como procesado ANTES de procesarlo para evitar loops infinitos
      const forExpression = element.getAttribute('r-for');

      // Verificar si este template ya tiene un procesador activo
      if (!element._r_forProcessed) {
        element._r_forProcessed = true;
        processor.processFor(element, forExpression);
      }

      return; // No procesar hijos del template
    }

    // Procesar r-effect
    if (element.hasAttribute('r-effect')) {
      processor.processEffect(element.getAttribute('r-effect'));
    }

    // Procesar r-show
    if (element.hasAttribute('r-show')) {
      processor.processShow(element.getAttribute('r-show'));
    }

    // Procesar r-text
    if (element.hasAttribute('r-text')) {
      processor.processText(element.getAttribute('r-text'));
    }

    // Procesar r-model
    if (element.hasAttribute('r-model')) {
      processor.processModel(element.getAttribute('r-model'));
    }

    // Procesar r-bind y : shorthand
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('r-bind:')) {
        const attrName = attr.name.substring(7);
        processor.processBind(attrName, attr.value);
      } else if (attr.name.startsWith(':') && attr.name !== ':key') {
        const attrName = attr.name.substring(1);
        processor.processBind(attrName, attr.value);
      }
    });

    // Procesar r-on y @ shorthand
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('r-on:')) {
        const parts = attr.name.substring(5).split('.');
        const event = parts[0];
        const modifiers = parts.slice(1);
        processor.processEvent(event, attr.value, modifiers);
      } else if (attr.name.startsWith('@')) {
        const parts = attr.name.substring(1).split('.');
        const event = parts[0];
        const modifiers = parts.slice(1);
        processor.processEvent(event, attr.value, modifiers);
      }
    });

    // Procesar hijos recursivamente
    Array.from(element.children).forEach(child => {
      processElement(child, currentScope);
    });
  };

  // Observador para detectar cambios dinámicos en el DOM
  let observer = null;
  let observerPaused = false;

  const pauseObserver = () => {
    observerPaused = true;
  };

  const resumeObserver = () => {
    observerPaused = false;
  };

  const startObserver = () => {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (observerPaused) return;

      mutations.forEach((mutation) => {
        // Procesar nodos agregados
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Procesar el nodo y sus descendientes
            traverseDOM(node, (element) => {
              if (element.hasAttribute && (
                element.hasAttribute('r-data') ||
                element.hasAttribute('r-init') ||
                element.hasAttribute('r-show') ||
                element.hasAttribute('r-text') ||
                element.hasAttribute('r-model') ||
                element.hasAttribute('r-for') ||
                Array.from(element.attributes).some(a =>
                  a.name.startsWith('r-') ||
                  a.name.startsWith(':') ||
                  a.name.startsWith('@')
                )
              )) {
                processElement(element);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  };

  // Helper para recorrer el DOM
  const traverseDOM = (element, callback) => {
    if (!element || element.nodeType !== 1) return;

    callback(element);

    Array.from(element.children).forEach(child => {
      traverseDOM(child, callback);
    });
  };

  // Inicializar
  const init = () => {
    // Procesar todos los elementos con directivas r-
    document.querySelectorAll('[r-data]').forEach(element => {
      processElement(element);
    });

    // Iniciar observador para detectar elementos agregados dinámicamente
    startObserver();
  };

  // API pública
  window.Robertito = {
    init: init,
    version: '1.0.0',
    processElement: processElement,
  };

  // Auto-iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
