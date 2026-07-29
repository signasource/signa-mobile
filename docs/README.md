<!--
última actualización: 2026-07-29
mantener al: agregar/renombrar un doc en esta carpeta o cambiar cómo se documenta el proyecto.
-->

# Documentación de signa-mobile

Esta carpeta es el detalle de implementación que complementa a [`../CLAUDE.md`](../CLAUDE.md).
Está pensada para ser **leída y mantenida por IA** (Claude y Claude Design) a medida que avanza
el desarrollo. El `README.md` de la raíz apunta al onboarding humano del repo; estos docs
apuntan a desarrollar features manteniendo las convenciones.

## Índice

| Doc | Qué contiene |
|---|---|
| [`arquitectura.md`](./arquitectura.md) | Estructura de carpetas, alias `@/`, capas y flujo de arranque de `App.tsx`. |
| [`navegacion.md`](./navegacion.md) | Root/Auth/App navigators, rutas y params tipados, cómo agregar una pantalla. |
| [`api-y-datos.md`](./api-y-datos.md) | Cliente Axios + interceptores, endpoints (reales vs stub), tipos, storage de tokens. |
| [`auth.md`](./auth.md) | `AuthContext`, flujos de login/registro/recupero, validación y manejo de errores. |
| [`design-system.md`](./design-system.md) | Paleta, tipografía, `fontSizes`, catálogo de primitivas de UI. **Para Claude Design.** |
| [`features.md`](./features.md) | Estado por feature: onboarding (real), courses (stub), ml (placeholder). |
| [`estado-y-roadmap.md`](./estado-y-roadmap.md) | Qué es real vs stub hoy, deuda técnica conocida y próximos pasos. |

## Cómo mantener estos docs

- **Regla:** la documentación se actualiza en el **mismo commit** que el cambio de código.
  La tabla "cuándo tocar qué doc" está en [`../CLAUDE.md` §5](../CLAUDE.md#5-mantener-la-documentación).
- Cada doc tiene un comentario HTML arriba con `última actualización` y `mantener al:`.
  Actualizá la fecha cuando lo edites.
- Preferí describir **patrones y convenciones** por sobre copiar código extenso: citá el archivo
  fuente (`src/...`) en vez de duplicarlo, así el doc no se desactualiza tan rápido.
- Si un dato del doc contradice al código, **el código gana**: corregí el doc.
