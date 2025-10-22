# ROBERTITO.JS v1.0.0

Framework reactivo minimalista 100% en español para crear interfaces de usuario dinámicas.

**Desarrollado por**: Roberto Miguel Costi

---

## 📖 Tabla de Contenidos

- [Instalación](#instalación)
- [Inicio Rápido](#inicio-rápido)
- [Directivas](#directivas)
  - [r-datos](#r-datos)
  - [r-inicio](#r-inicio)
  - [r-mostrar](#r-mostrar)
  - [r-texto](#r-texto)
  - [r-modelo](#r-modelo)
  - [r-para](#r-para)
  - [r-enlace](#r-enlace-o-)
  - [r-evento](#r-evento-o-)
  - [r-efecto](#r-efecto)
- [Propiedades Mágicas](#propiedades-mágicas)
  - [$elemento](#elemento)
  - [$siguienteCiclo](#siguienteciclo)
- [Ejemplos](#ejemplos)
- [Licencia](#licencia)

---

## Instalación

Incluir robertito.js en tu HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Versión minificada (recomendada para producción) -->
    <script defer src="/lib/robertito.min.js"></script>

    <!-- O versión completa (para desarrollo) -->
    <!-- <script defer src="/lib/robertito.js"></script> -->
</head>
<body>
    <div r-datos="{ contador: 0 }">
        <button @click="contador++">Clicks: <span r-texto="contador"></span></button>
    </div>
</body>
</html>
```

**Requisitos:**
- Navegador moderno con soporte ES6 Proxy
- Sin dependencias externas
- **25KB** sin minificar / **9.1KB** minificado

---

## Inicio Rápido

### Componente básico

```html
<div r-datos="{ mensaje: 'Hola Mundo' }">
    <p r-texto="mensaje"></p>
</div>
```

### Componente con función

```html
<div r-datos="Contador()">
    <button @click="incrementar()">
        Contador: <span r-texto="contador"></span>
    </button>
</div>

<script>
function Contador() {
    return {
        contador: 0,

        incrementar() {
            this.contador++;
        }
    }
}
</script>
```

---

## Directivas

### `r-datos`

Define los datos reactivos del componente.

**Uso:**
```html
<!-- Objeto literal -->
<div r-datos="{ nombre: 'Roberto', edad: 25 }">
    <p r-texto="nombre"></p>
</div>

<!-- Función que retorna objeto -->
<div r-datos="Usuario()">
    <p r-texto="nombre"></p>
</div>

<!-- Alcance vacío (hereda del padre) -->
<div r-datos="">
    <!-- Accede a datos del componente padre -->
</div>
```

**Inicialización automática con `init()`:**
```javascript
function MiComponente() {
    return {
        datos: null,

        // Se ejecuta automáticamente al inicializar
        init() {
            console.log('Componente listo');
            this.datos = 'Inicializado';
        }
    }
}
```

**Inicialización asíncrona:**
```javascript
function AppConAPI() {
    return {
        usuarios: [],

        async init() {
            // Los hijos se procesan DESPUÉS de que termine esto
            const respuesta = await fetch('/api/usuarios');
            this.usuarios = await respuesta.json();
        }
    }
}
```

---

### `r-inicio`

Ejecuta código cuando el elemento se inicializa.

**Uso:**
```html
<div r-datos="{ mensaje: '' }" r-inicio="mensaje = 'Cargado'">
    <p r-texto="mensaje"></p>
</div>

<!-- Con async/await -->
<div r-datos="App()" r-inicio="await cargarDatos()">
    <!-- Se procesa después de cargarDatos() -->
</div>

<!-- Múltiples sentencias -->
<div r-inicio="console.log('Iniciando'); contador = 0">
</div>
```

---

### `r-mostrar`

Muestra u oculta elemento con `display: none`.

**Uso:**
```html
<div r-datos="{ abierto: true }">
    <button @click="abierto = !abierto">Alternar</button>

    <div r-mostrar="abierto">
        Este contenido se puede ocultar
    </div>
</div>

<!-- Con expresiones -->
<div r-datos="{ items: [] }">
    <p r-mostrar="items.length === 0">No hay items</p>
    <p r-mostrar="items.length > 0">Hay <span r-texto="items.length"></span> items</p>
</div>
```

---

### `r-texto`

Actualiza el contenido de texto del elemento.

**Uso:**
```html
<div r-datos="{ nombre: 'Roberto' }">
    <!-- Texto simple -->
    <h1 r-texto="nombre"></h1>

    <!-- Concatenación -->
    <p r-texto="'Hola ' + nombre"></p>

    <!-- Template literals -->
    <span r-texto="`Bienvenido, ${nombre}!`"></span>

    <!-- Expresiones -->
    <p r-texto="edad >= 18 ? 'Mayor' : 'Menor'"></p>
</div>
```

---

### `r-modelo`

Binding bidireccional para inputs.

**Uso:**
```html
<div r-datos="{
    texto: '',
    numero: 0,
    activo: false,
    opcion: 'A',
    pais: 'ar'
}">
    <!-- Text input -->
    <input type="text" r-modelo="texto">
    <p>Escribiste: <span r-texto="texto"></span></p>

    <!-- Number input -->
    <input type="number" r-modelo="numero">

    <!-- Checkbox -->
    <label>
        <input type="checkbox" r-modelo="activo">
        <span r-texto="activo ? 'Activo' : 'Inactivo'"></span>
    </label>

    <!-- Radio buttons -->
    <input type="radio" name="opcion" value="A" r-modelo="opcion"> Opción A
    <input type="radio" name="opcion" value="B" r-modelo="opcion"> Opción B

    <!-- Select -->
    <select r-modelo="pais">
        <option value="ar">Argentina</option>
        <option value="mx">México</option>
        <option value="es">España</option>
    </select>

    <!-- Textarea -->
    <textarea r-modelo="texto"></textarea>
</div>
```

**Propiedades anidadas:**
```html
<div r-datos="{ usuario: { nombre: '', email: '' } }">
    <input r-modelo="usuario.nombre" placeholder="Nombre">
    <input r-modelo="usuario.email" placeholder="Email">
</div>
```

---

### `r-para`

Itera sobre arrays para renderizar listas.

**Sintaxis:** `item en items` (en español)

**Uso:**
```html
<!-- Básico -->
<div r-datos="{ frutas: ['Manzana', 'Banana', 'Naranja'] }">
    <ul>
        <template r-para="fruta en frutas">
            <li r-texto="fruta"></li>
        </template>
    </ul>
</div>

<!-- Con índice -->
<div r-datos="{ items: ['A', 'B', 'C'] }">
    <template r-para="(item, indice) en items">
        <p>
            <span r-texto="indice + 1"></span>.
            <span r-texto="item"></span>
        </p>
    </template>
</div>

<!-- Con objetos -->
<div r-datos="{ usuarios: [
    { id: 1, nombre: 'Ana' },
    { id: 2, nombre: 'Luis' }
] }">
    <template r-para="usuario en usuarios" :clave="usuario.id">
        <div r-texto="usuario.nombre"></div>
    </template>
</div>
```

**Notas importantes:**
- Debe usarse en un `<template>`
- Opcionalmente usa `:clave` para optimización
- El array se actualiza automáticamente con: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`

**Agregar/eliminar items:**
```javascript
function Lista() {
    return {
        items: [],

        agregar(item) {
            this.items.push(item); // ✅ Se actualiza automáticamente
        },

        eliminar(indice) {
            this.items.splice(indice, 1); // ✅ Se actualiza automáticamente
        }
    }
}
```

---

### `r-enlace` (o `:`)

Vincula atributos HTML dinámicamente.

**Sintaxis corta:** `:atributo="valor"`

**Uso:**
```html
<div r-datos="{
    itemId: 42,
    color: 'red',
    activo: true,
    cargando: false
}">
    <!-- Atributos normales -->
    <div :id="'item-' + itemId"></div>

    <!-- Atributos booleanos -->
    <button :disabled="cargando">Guardar</button>
    <input type="checkbox" :checked="activo">

    <!-- Class (string) -->
    <div :class="activo ? 'active' : 'inactive'"></div>

    <!-- Class (objeto) -->
    <div :class="{
        'active': activo,
        'disabled': !activo,
        'loading': cargando
    }"></div>

    <!-- Style (string) -->
    <div :style="'background: ' + color + '; padding: 20px'"></div>

    <!-- Style (objeto) -->
    <div :style="{
        background: color,
        padding: '20px',
        fontSize: '16px'
    }"></div>

    <!-- Src de imagen -->
    <img :src="'/images/' + imagen + '.png'" :alt="descripcion">
</div>
```

---

### `r-evento` (o `@`)

Escucha eventos del DOM.

**Sintaxis corta:** `@evento="codigo"`

**Uso básico:**
```html
<div r-datos="{ contador: 0 }">
    <!-- Expresión inline -->
    <button @click="contador++">Incrementar</button>

    <!-- Llamar método -->
    <button @click="guardar()">Guardar</button>

    <!-- Pasar parámetros -->
    <button @click="eliminar(42)">Eliminar</button>
</div>
```

**Modificadores:**
```html
<div r-datos="{}">
    <!-- .prevenir - Previene acción por defecto -->
    <form @submit.prevenir="handleSubmit()">
        <button type="submit">Enviar</button>
    </form>

    <!-- .detener - Detiene propagación -->
    <div @click.detener="handleClick()">
        Click aquí
    </div>

    <!-- .enter - Solo ejecuta cuando se presiona Enter -->
    <input @keyup.enter="buscar()" placeholder="Presiona Enter">

    <!-- .escape - Solo ejecuta cuando se presiona Escape -->
    <div @keydown.escape="cerrarModal()">Modal</div>

    <!-- .space - Solo ejecuta cuando se presiona Espacio -->
    <div @keypress.space="activar()">Presiona espacio</div>

    <!-- .tab - Solo ejecuta cuando se presiona Tab -->
    <input @keydown.tab="siguienteCampo()">

    <!-- Múltiples modificadores -->
    <a href="#" @click.prevenir.detener="handleLink()">Link</a>
</div>
```

**Modificadores disponibles:**
- `.prevenir` - Llama `event.preventDefault()`
- `.detener` - Llama `event.stopPropagation()`
- `.enter` - Solo ejecuta cuando se presiona Enter
- `.escape` - Solo ejecuta cuando se presiona Escape
- `.space` - Solo ejecuta cuando se presiona Espacio
- `.tab` - Solo ejecuta cuando se presiona Tab

**Eventos comunes:**
```html
<div r-datos="{ valor: '' }">
    <!-- Click -->
    <button @click="accion()">Click</button>

    <!-- Input (en tiempo real) -->
    <input @input="buscar()">

    <!-- Change (al perder foco) -->
    <select @change="cambioSeleccion()">...</select>

    <!-- Submit -->
    <form @submit.prevenir="enviar()">...</form>

    <!-- Teclado -->
    <input @keyup.enter="confirmar()">

    <!-- Mouse -->
    <div @mouseenter="mostrar()" @mouseleave="ocultar()">
        Hover me
    </div>
</div>
```

---

### `r-efecto`

Ejecuta código cuando cambian variables reactivas.

**Uso:**
```html
<!-- Efecto simple -->
<div r-datos="{ contador: 0 }"
     r-efecto="console.log('Contador cambió:', contador)">
    <button @click="contador++">Incrementar</button>
</div>

<!-- Múltiples dependencias -->
<div r-datos="{ nombre: '', apellido: '' }"
     r-efecto="console.log('Nombre completo:', nombre + ' ' + apellido)">
    <input r-modelo="nombre" placeholder="Nombre">
    <input r-modelo="apellido" placeholder="Apellido">
</div>
```

**Nota:** El efecto se ejecuta inmediatamente y cada vez que cambia alguna variable usada en la expresión.

---

## Propiedades Mágicas

### `$elemento`

Referencia al elemento DOM del componente.

**Uso:**
```javascript
function MiComponente() {
    return {
        resaltar() {
            // Acceder al elemento directamente
            this.$elemento.style.border = '2px solid red';
            this.$elemento.scrollIntoView();
        },

        obtenerAncho() {
            return this.$elemento.offsetWidth;
        }
    }
}
```

```html
<div r-datos="MiComponente()">
    <button @click="resaltar()">Resaltar contenedor</button>
</div>
```

---

### `$siguienteCiclo`

Espera a que el DOM se actualice antes de ejecutar código.

**Uso:**
```javascript
function GaleriaImagenes() {
    return {
        imagenes: [],

        async agregarImagen(img) {
            // Agregar imagen al array
            this.imagenes.push(img);

            // Esperar a que el DOM se actualice
            await this.$siguienteCiclo();

            // Ahora el elemento existe en el DOM
            const canvas = document.getElementById('canvas-0');
            this.dibujarEnCanvas(canvas, img);
        }
    }
}
```

**Cuándo usar:**
- Cuando necesitas manipular un elemento que acabas de agregar
- Después de cambiar datos y necesitas medir el DOM
- Para asegurar que las animaciones funcionen correctamente

---

## Ejemplos

### Contador Simple

```html
<div r-datos="{ contador: 0 }">
    <h1 r-texto="contador"></h1>
    <button @click="contador++">+</button>
    <button @click="contador--">-</button>
    <button @click="contador = 0">Reset</button>
</div>
```

---

### Formulario con Validación

```html
<div r-datos="Formulario()">
    <form @submit.prevenir="enviar()">
        <input
            type="text"
            r-modelo="nombre"
            placeholder="Nombre">

        <input
            type="email"
            r-modelo="email"
            placeholder="Email">

        <p r-mostrar="error" r-texto="error" style="color: red;"></p>

        <button
            type="submit"
            :disabled="enviando">
            <span r-texto="enviando ? 'Enviando...' : 'Enviar'"></span>
        </button>
    </form>
</div>

<script>
function Formulario() {
    return {
        nombre: '',
        email: '',
        error: '',
        enviando: false,

        async enviar() {
            this.error = '';

            if (!this.nombre || !this.email) {
                this.error = 'Todos los campos son requeridos';
                return;
            }

            this.enviando = true;

            try {
                const respuesta = await fetch('/api/contacto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: this.nombre,
                        email: this.email
                    })
                });

                if (respuesta.ok) {
                    alert('Formulario enviado!');
                    this.nombre = '';
                    this.email = '';
                }
            } catch (e) {
                this.error = 'Error al enviar';
            } finally {
                this.enviando = false;
            }
        }
    }
}
</script>
```

---

### Lista de Tareas

```html
<div r-datos="ListaTareas()">
    <input
        r-modelo="nuevaTarea"
        @keyup.enter="agregar()"
        placeholder="Nueva tarea">

    <button @click="agregar()">Agregar</button>

    <ul>
        <template r-para="(tarea, indice) en tareas" :clave="indice">
            <li>
                <input
                    type="checkbox"
                    :checked="tarea.completada"
                    @change="toggleTarea(indice)">

                <span
                    r-texto="tarea.texto"
                    :style="{ textDecoration: tarea.completada ? 'line-through' : 'none' }">
                </span>

                <button @click="eliminar(indice)">X</button>
            </li>
        </template>
    </ul>

    <p r-mostrar="tareas.length === 0">No hay tareas</p>
</div>

<script>
function ListaTareas() {
    return {
        tareas: [],
        nuevaTarea: '',

        agregar() {
            if (this.nuevaTarea.trim()) {
                this.tareas.push({
                    texto: this.nuevaTarea,
                    completada: false
                });
                this.nuevaTarea = '';
            }
        },

        eliminar(indice) {
            this.tareas.splice(indice, 1);
        },

        toggleTarea(indice) {
            this.tareas[indice].completada = !this.tareas[indice].completada;
        }
    }
}
</script>
```

---

### Select Dinámico con API

```html
<div r-datos="SelectAPI()">
    <label r-texto="etiqueta"></label>

    <select r-modelo="seleccionado" @change="onChange()">
        <option value="">Seleccionar...</option>
        <template r-para="item en items" :clave="item.id">
            <option :value="item.id" r-texto="item.nombre"></option>
        </template>
    </select>

    <span r-mostrar="cargando">Cargando...</span>
    <p r-mostrar="error" r-texto="error" style="color: red;"></p>
</div>

<script>
function SelectAPI() {
    return {
        etiqueta: 'Seleccione una opción',
        items: [],
        seleccionado: '',
        cargando: false,
        error: '',

        async init() {
            await this.cargarItems();
        },

        async cargarItems() {
            this.cargando = true;
            this.error = '';

            try {
                const respuesta = await fetch('/api/items');
                this.items = await respuesta.json();
            } catch (e) {
                this.error = 'Error al cargar datos';
            } finally {
                this.cargando = false;
            }
        },

        onChange() {
            const item = this.items.find(i => i.id == this.seleccionado);
            console.log('Seleccionado:', item);
        }
    }
}
</script>
```

---

### Tabs (Pestañas)

```html
<div r-datos="{ tabActual: 'inicio' }">
    <div>
        <button
            @click="tabActual = 'inicio'"
            :class="{ 'active': tabActual === 'inicio' }">
            Inicio
        </button>
        <button
            @click="tabActual = 'perfil'"
            :class="{ 'active': tabActual === 'perfil' }">
            Perfil
        </button>
        <button
            @click="tabActual = 'config'"
            :class="{ 'active': tabActual === 'config' }">
            Configuración
        </button>
    </div>

    <div r-mostrar="tabActual === 'inicio'">
        <h2>Inicio</h2>
        <p>Contenido de inicio...</p>
    </div>

    <div r-mostrar="tabActual === 'perfil'">
        <h2>Perfil</h2>
        <p>Contenido de perfil...</p>
    </div>

    <div r-mostrar="tabActual === 'config'">
        <h2>Configuración</h2>
        <p>Contenido de configuración...</p>
    </div>
</div>
```

---

### Modal/Diálogo

```html
<div r-datos="{ abierto: false }">
    <button @click="abierto = true">Abrir Modal</button>

    <!-- Overlay -->
    <div
        r-mostrar="abierto"
        @click="abierto = false"
        style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">

        <!-- Modal -->
        <div
            @click.detener
            style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px;">

            <h2>Mi Modal</h2>
            <p>Contenido del modal...</p>

            <button @click="abierto = false">Cerrar</button>
        </div>
    </div>
</div>
```

---

## Licencia

MIT License

Copyright (c) 2025 Roberto Miguel Costi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
