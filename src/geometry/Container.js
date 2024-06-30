
// import paper from 'paper/dist/paper-core';
// import {LayerGroup} from './DimensionDrawer';
import {Contour} from './Contour';
import {Filling} from './Filling';

/**
 * @summary Область-проём для слоёв и заполнений
 * @desc Возвращает периметр с узлами скелетона. Живёт в координатной системе изделия, отвечает только за 2D
 */
export class Container  {
  
  #raw = {owner: null, cycle: null};

  constructor(owner, cycle) {
    Object.assign(this.#raw, {owner, cycle});
    owner.children[cycle.key] = this;
    this.createChild({kind: 'glass'});
  }
  
  get key() {
    return this.#raw.cycle.key;
  }
  
  get kind() {
    return this.#raw.kind;
  }

  /**
   * @summary {{#crossLink "Skeleton"}}Скелетон{{/crossLink}} слоя, которому принадлежит `Область`
   * @Type {Skeleton}
   */
  get skeleton() {
    return this.#raw.owner.skeleton;
  }

  get free() {
    return this.#raw.owner.free;
  }
  
  get layer() {
    return this.skeleton.owner;
  }

  /**
   * @summary Последовательность {{#crossLink "GraphEdge"}}рёбер{{/crossLink}}, образующая `Область`
   */
  get perimeter() {
    return this.#raw.cycle;
  }
  
  get pathInner() {
    const offset = -30;
    const {cycle} = this.#raw;
    const paths = [];
    const res = [];
    if(cycle.length > 1) {
      for(let i = 0; i < cycle.length; i++) {
        const {startVertex, endVertex, profile} = cycle[i];
        paths.push(new paper.Path({insert: false, segments: [startVertex.point, endVertex.point]}).equidistant(offset));
      }
      for(let i = 0; i < cycle.length; i++) {
        const prev = paths[i === 0 ? cycle.length -1 : i - 1];
        const curr = paths[i];
        const next = paths[i === cycle.length - 1 ? 0 : i + 1];
        res.push(Object.assign(curr.intersectPoint(prev, curr.firstSegment.point, Math.abs(offset) * 3), {edge: cycle[i]}));
      }
    }
    return res;
  }
  
  get width() {
    return this.#raw.width;
  }
  set width(v) {
    this.#raw.width = Number(v);
  }

  get height() {
    return this.#raw.height;
  }
  set height(v) {
    this.#raw.height = Number(v);
  }


  /**
   * @summary Создаёт дочернее заполнение или слой
   */
  createChild({kind}) {
    if(kind !== this.#raw.kind) {
      this.#raw.child?.remove();
      const {pathInner, layer} = this;
      if(kind === 'flap') {
        const child = new Contour({
          project: layer.project,
          parent: layer.children.topLayers,
        });
        const profiles = [];
        for(let i = 0; i < pathInner.length; i++) {
          const b = pathInner[i];
          const e = pathInner[i === pathInner.length - 1 ? 0 : i + 1];
          profiles.push(child.createProfile({b, e, edge: b.edge, loading: true}));
        }
        for(const profile of profiles) {
          child.skeleton.addProfile(profile);
        }
        this.#raw.child = child; 
      }
      else if(kind === 'glass') {
        this.#raw.child = new Filling({
          project: layer.project,
          layer,
          parent: layer.children.fillings,
          pathOuter: pathInner,
        });
      }
      this.#raw.kind = kind;
      return;
    }
    this.sync();
  }

  remove() {
    const {owner, cycle} = this.#raw;
    // удалить элементы рисовалки
    // удалить себя из коллекции владельца
    delete owner.children[cycle.key];
  }

  sync() {
    const {pathInner} = this;
    const {kind, child} = this.#raw;
    if(kind === 'flap') {
      for(let i = 0; i < pathInner.length; i++) {
        const b = pathInner[i];
        for(const profile of child.profiles) {
          if(profile.edge === b.edge && !profile.b.vertex.point.isNearest(b)) {
            profile.b.vertex.point = b.clone();
          }
        }
      }
    }
    else if(kind === 'glass') {
      child.path = pathInner;
    }
  }


  
}


