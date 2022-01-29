import { WorkspaceSymbols } from '../../lib/ngtsc/workspace.symbols';
import { join } from 'path';
import { TemplateNode } from '../../lib/ngtsc/template-transform.visitor';

function getFolder(name: string) {
  return join(__dirname, '/../../../test/fixture', name);
}

describe('Templates', () => {
  let workspace: WorkspaceSymbols;
  const folder = getFolder('ngtsc-template');

  beforeEach(() => workspace = new WorkspaceSymbols(`${folder}/tsconfig.json`));

  it('Should get the associated components', () => {
    const [component] = workspace.getAllComponents();
    expect(component.name).toBe('AppComponent');
    expect(component.metadata!.selector).toBe('app-component');
    const templateResult = component.getTemplateAst();
    expect(templateResult).not.toBe(null);
    const template = templateResult as TemplateNode[];
    expect(template[0].name).toBe('ng-template');
    expect(template[0].children[0].children[0].component!.metadata!.selector).toBe('main-component');
    expect(template[1].directives[0].metadata!.selector).toBe('[transitive]');
    expect(template[2].directives.length).toBe(0);
    expect(template[0].directives[0].name).toBe('NgForOf');
  });

  it('Should get the component', () => {
    const [_, component] = workspace.getAllComponents();
    expect(component.name).toBe('MainComponent');
    const [templateResult] = component.getTemplateAst() as [TemplateNode];
    expect(templateResult.children.length).toBe(0);
  });
});
