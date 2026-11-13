from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'database.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
Session = sessionmaker(bind=engine)


def migrate_legacy_database(target_engine=engine):
    if target_engine.dialect.name != "sqlite":
        return

    connection = target_engine.raw_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("PRAGMA legacy_alter_table=ON")
        connection.commit()
        tables = {
            row[0]
            for row in cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if not {"answers", "quizzes", "quiz_attempts", "results", "users"} <= tables:
            return

        columns_by_table = {}
        for table in ("answers", "quizzes", "quiz_attempts", "results"):
            columns_by_table[table] = {
                row[1]: row for row in cursor.execute(f"PRAGMA table_info({table})")
            }

        connection.execute("BEGIN")
        if "answer_content" not in columns_by_table["answers"]:
            cursor.execute(
                "ALTER TABLE answers ADD COLUMN answer_content VARCHAR(120) NOT NULL DEFAULT ''"
            )
        if "description" not in columns_by_table["quizzes"]:
            cursor.execute("ALTER TABLE quizzes ADD COLUMN description VARCHAR(500)")
        if "player_name" not in columns_by_table["quiz_attempts"]:
            cursor.execute(
                "ALTER TABLE quiz_attempts ADD COLUMN player_name VARCHAR(30) NOT NULL DEFAULT ''"
            )
        if "attempt_token_hash" not in columns_by_table["quiz_attempts"]:
            cursor.execute(
                "ALTER TABLE quiz_attempts ADD COLUMN attempt_token_hash VARCHAR(64) NOT NULL DEFAULT ''"
            )
        if "player_name" not in columns_by_table["results"]:
            cursor.execute(
                "ALTER TABLE results ADD COLUMN player_name VARCHAR(30) NOT NULL DEFAULT ''"
            )

        cursor.execute(
            "UPDATE quiz_attempts SET player_name = "
            "(SELECT username FROM users WHERE users.id = quiz_attempts.user_id) "
            "WHERE player_name = '' AND user_id IS NOT NULL"
        )
        cursor.execute(
            "UPDATE results SET player_name = "
            "(SELECT username FROM users WHERE users.id = results.user_id) "
            "WHERE player_name = '' AND user_id IS NOT NULL"
        )

        if columns_by_table["quiz_attempts"]["user_id"][3]:
            cursor.execute("ALTER TABLE quiz_attempts RENAME TO quiz_attempts_legacy")
            cursor.execute(
                "CREATE TABLE quiz_attempts ("
                "id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER, "
                "player_name VARCHAR(30) NOT NULL, attempt_token_hash VARCHAR(64) NOT NULL, "
                "quiz_id INTEGER NOT NULL, started_at DATETIME NOT NULL, completed_at DATETIME, "
                "FOREIGN KEY(user_id) REFERENCES users (id), "
                "FOREIGN KEY(quiz_id) REFERENCES quizzes (id))"
            )
            cursor.execute(
                "INSERT INTO quiz_attempts "
                "SELECT id, user_id, player_name, attempt_token_hash, quiz_id, started_at, completed_at "
                "FROM quiz_attempts_legacy"
            )
            cursor.execute("DROP TABLE quiz_attempts_legacy")

        if columns_by_table["results"]["user_id"][3]:
            cursor.execute("ALTER TABLE results RENAME TO results_legacy")
            cursor.execute(
                "CREATE TABLE results ("
                "id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER, player_name VARCHAR(30) NOT NULL, "
                "quiz_id INTEGER NOT NULL, score INTEGER NOT NULL, total_questions INTEGER NOT NULL, "
                "completed_at DATETIME NOT NULL, FOREIGN KEY(user_id) REFERENCES users (id), "
                "FOREIGN KEY(quiz_id) REFERENCES quizzes (id))"
            )
            cursor.execute(
                "INSERT INTO results "
                "SELECT id, user_id, player_name, quiz_id, score, total_questions, completed_at "
                "FROM results_legacy"
            )
            cursor.execute("DROP TABLE results_legacy")
        connection.commit()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA legacy_alter_table=OFF")
        violations = cursor.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise RuntimeError(f"Database migration left foreign key violations: {violations}")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.rollback()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA legacy_alter_table=OFF")
        connection.commit()
        connection.close()


class Base(DeclarativeBase):
    pass


def get_db():
    with Session() as db:
        yield db