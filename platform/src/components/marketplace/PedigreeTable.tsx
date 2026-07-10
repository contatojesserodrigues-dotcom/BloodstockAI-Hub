export interface PedigreeJson {
  sire?: string;
  dam?: string;
  sire_sire?: string;
  sire_dam?: string;
  dam_sire?: string;
  dam_dam?: string;
  sire_sire_sire?: string;
  sire_sire_dam?: string;
  sire_dam_sire?: string;
  sire_dam_dam?: string;
  dam_sire_sire?: string;
  dam_sire_dam?: string;
  dam_dam_sire?: string;
  dam_dam_dam?: string;
}

const Cell = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`border border-border/40 px-3 py-2 text-xs uppercase tracking-wider align-middle ${className}`}>
    {children || <span className="text-muted-foreground/60">—</span>}
  </td>
);

export const PedigreeTable = ({ pedigree }: { pedigree: PedigreeJson | null }) => {
  const p = pedigree ?? {};
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-foreground min-w-[600px]">
        <tbody>
          {/* Sire side */}
          <tr>
            <Cell className="bg-muted/40 font-semibold" >{p.sire}</Cell>
            <Cell className="bg-muted/20">{p.sire_sire}</Cell>
            <Cell>{p.sire_sire_sire}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20"></Cell>
            <Cell>{p.sire_sire_dam}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20">{p.sire_dam}</Cell>
            <Cell>{p.sire_dam_sire}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20"></Cell>
            <Cell>{p.sire_dam_dam}</Cell>
          </tr>
          {/* Dam side */}
          <tr>
            <Cell className="bg-muted/40 font-semibold">{p.dam}</Cell>
            <Cell className="bg-muted/20">{p.dam_sire}</Cell>
            <Cell>{p.dam_sire_sire}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20"></Cell>
            <Cell>{p.dam_sire_dam}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20">{p.dam_dam}</Cell>
            <Cell>{p.dam_dam_sire}</Cell>
          </tr>
          <tr>
            <Cell className="bg-muted/40 font-semibold"></Cell>
            <Cell className="bg-muted/20"></Cell>
            <Cell>{p.dam_dam_dam}</Cell>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PedigreeTable;