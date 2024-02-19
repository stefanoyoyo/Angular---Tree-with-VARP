import {SelectionModel} from '@angular/cdk/collections';
import {FlatTreeControl} from '@angular/cdk/tree';
import {Component, Injectable} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {BehaviorSubject} from 'rxjs';

export interface ExpressionElement {
  Operator: string | null;
  IsNot: boolean;
  IsParenthesis: boolean;
  ExpressionElement: string;
  ExpressionElementTokenized: {
    Left_operand: string;
    Splitter: string;
    Right_operand: string;
  };
  Uuuid: string;
  ParamName: string;
  LevelNth: number;
  IsResultElement: boolean;
  ResultValue: any | null;
  Children: ExpressionElement[] | null;
  ParamConfig: {
    element: string;
    type: string;
    value: string;
    name: string;
    description: string | null;
    checkExpr: string | null;
    preset: any | null;
    config: {
      translate: {
        element: boolean;
        value: boolean;
      };
      expression: string | null;
    };
    devComment: string;
  };
  checkExpr: string | null;
  checkExprAsJson: any[];
}

export class TodoItemNode {
  children: TodoItemNode[];
  ExpressionElement: string;
}

export class TodoItemFlatNode {
  ExpressionElement: string;
  level: number;
  expandable: boolean;
}

@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<TodoItemNode[]>([]);

  get data(): TodoItemNode[] { return this.dataChange.value; }

  constructor() {
    this.initialize();
  }

  YOUR_JSON_DATA = [
    {
        "Operator": null,
        "IsNot": false,
        "IsParenthesis": false,
        "ExpressionElement": "p1 > 0",
        "ExpressionElementTokenized": {
            "Left_operand": "p1",
            "Splitter": ">",
            "Right_operand": "0"
        },
        "Uuuid": "10e7d8ef-a608-4389-82f5-3599dad8e444",
        "ParamName": "p1",
        "LevelNth": 2,
        "IsResultElement": false,
        "ResultValue": null,
        "Children": null,
        "ParamConfig": {
            "element": "PARAMETER",
            "type": "number",
            "value": "BEATS_NUMBER",
            "name": "p1",
            "description": null,
            "checkExpr": null,
            "preset": null,
            "config": {
                "translate": {
                    "element": true,
                    "value": false
                },
                "expression": null
            },
            "devComment": "Se non c'è condizione, significa che è sufficiente mostrare il valore del parametro ricevuto"
        },
        "checkExpr": "test",
        "checkExprAsJson": []
    }
]


  initialize() {
    const data = this.buildFileTree(this.YOUR_JSON_DATA, 0);
    this.dataChange.next(data);
  }

  buildFileTree(data: ExpressionElement[], level: number): TodoItemNode[] {
    return data.map(item => {
      const node = new TodoItemNode();
      node.ExpressionElement = item.ExpressionElement;
      if (item.Children && item.Children.length > 0) {
        node.children = this.buildFileTree(item.Children, level + 1);
      }
      return node;
    });
  }

  insertItem(parent: TodoItemNode, name: string) {
    if (parent.children) {
      parent.children.push({ ExpressionElement: name, children: [] } as TodoItemNode);
      this.dataChange.next(this.data);
    }
  }

  updateItem(node: TodoItemNode, name: string) {
    node.ExpressionElement = name;
    this.dataChange.next(this.data);
  }
}

@Component({
  selector: 'tree-checklist-example',
  templateUrl: 'tree-checklist-example.html',
  styleUrls: ['tree-checklist-example.css'],
  providers: [ChecklistDatabase]
})
export class TreeChecklistExample {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  newItemName = '';

  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel,
      this.isExpandable, this.getChildren);
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
  }

  getLevel = (node: TodoItemFlatNode) => node.level;
  isExpandable = (node: TodoItemFlatNode) => node.expandable;
  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;
  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;
  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => !_nodeData.ExpressionElement;

  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.ExpressionElement === node.ExpressionElement
      ? existingNode
      : new TodoItemFlatNode();
    flatNode.ExpressionElement = node.ExpressionElement;
    flatNode.level = level;
    flatNode.expandable = !!node.children;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  }

  descendantsAllSelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.every(child =>
      this.checklistSelection.isSelected(child)
    );
    return descAllSelected;
  }

  descendantsPartiallySelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  todoItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    descendants.every(child =>
      this.checklistSelection.isSelected(child)
    );
    this.checkAllParentsSelection(node);
  }

  todoLeafItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  checkAllParentsSelection(node: TodoItemFlatNode): void {
    let parent: TodoItemFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  checkRootNodeSelection(node: TodoItemFlatNode): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.every(child =>
      this.checklistSelection.isSelected(child)
    );
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }
    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  addNewItem(node: TodoItemFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    this._database.insertItem(parentNode!, '');
    this.treeControl.expand(node);
  }

  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this._database.updateItem(nestedNode!, itemValue);
  }
}
