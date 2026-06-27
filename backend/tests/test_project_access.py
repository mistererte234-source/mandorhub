import unittest
import uuid
from types import SimpleNamespace

from sqlmodel import Session, SQLModel, create_engine

from backend.app.models import Project
from backend.app.routers.project import _get_projects_for_user


class ProjectAccessTests(unittest.TestCase):
    def test_contractor_sees_all_projects_in_organization(self):
        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)

        org_id = uuid.uuid4()
        contractor_id = uuid.uuid4()

        with Session(engine) as session:
            session.add(Project(org_id=org_id, name="Proyek A", created_by=contractor_id))
            session.add(Project(org_id=org_id, name="Proyek B", created_by=uuid.uuid4()))
            session.commit()

            contractor = SimpleNamespace(id=contractor_id, org_id=org_id, role="contractor")
            projects = _get_projects_for_user(session, contractor)

            self.assertEqual(len(projects), 2)
            self.assertEqual({p.name for p in projects}, {"Proyek A", "Proyek B"})


if __name__ == "__main__":
    unittest.main()
