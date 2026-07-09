import { Header } from "@/components/layout/Header";
import { OfficeMap } from "@/components/office/OfficeMap";

export const revalidate = 10;

export default function OfficePage() {
  return (
    <>
      <Header title="Virtual Office" subtitle="Interactive AI office map - monitor agents in their rooms" />
      <OfficeMap />
    </>
  );
}
